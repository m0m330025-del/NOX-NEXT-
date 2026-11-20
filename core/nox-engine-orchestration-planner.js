const finite = value => Number.isFinite(value);
const DEFAULT_DEPENDENCIES = {
  "global-motion-consensus": ["sparse-motion-vectors"],
  "global-translation-alignment": ["global-motion-consensus"],
  "confidence-gated-frame-fusion": ["global-translation-alignment"]
};

const normalizeList = value => Array.isArray(value)
  ? [...new Set(value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()))]
  : [];

export class NOXEngineOrchestrationPlanner {
  constructor({ minCapabilityConfidence = 0.15, overloadRatio = 0.92 } = {}) {
    this.minCapabilityConfidence = finite(minCapabilityConfidence)
      ? Math.max(0, Math.min(1, minCapabilityConfidence)) : 0.15;
    this.overloadRatio = finite(overloadRatio) ? Math.max(0.5, Math.min(2, overloadRatio)) : 0.92;
    this.reset();
  }

  evaluate(input = {}) {
    const engines = (Array.isArray(input.registeredEngines) ? input.registeredEngines : [])
      .filter(item => item && typeof item.id === "string" && item.registered === true)
      .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
      .map(item => ({
        id: item.id,
        name: typeof item.name === "string" ? item.name : item.id,
        category: typeof item.category === "string" ? item.category : "processing",
        capabilities: normalizeList(item.capabilities),
        enabled: typeof item.enabled === "boolean" ? item.enabled : null,
        statusAvailable: item.statusAvailable === true,
        requiresCapabilities: normalizeList(item.requiresCapabilities),
        conflictsWith: normalizeList(item.conflictsWith),
        estimatedCostMs: finite(item.estimatedCostMs) && item.estimatedCostMs >= 0 ? item.estimatedCostMs : null,
        priority: finite(item.priority) ? item.priority : 0
      }));
    const evidence = new Map();
    for (const item of Array.isArray(input.capabilityEvidence) ? input.capabilityEvidence : []) {
      if (!item || typeof item.capability !== "string") continue;
      evidence.set(item.capability, {
        available: item.available === true,
        confidence: finite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0,
        reason: typeof item.reason === "string" ? item.reason : "evidence-reason-unavailable"
      });
    }
    const dependencies = { ...DEFAULT_DEPENDENCIES, ...(input.capabilityDependencies || {}) };
    const capabilityDepth = (capability, trail = new Set()) => {
      if (trail.has(capability)) return Infinity;
      const next = new Set(trail);
      next.add(capability);
      const required = normalizeList(dependencies[capability]);
      if (!required.length) return 0;
      const depths = required.map(item => capabilityDepth(item, next));
      return depths.some(value => !Number.isFinite(value)) ? Infinity : 1 + Math.max(...depths);
    };
    const capabilityState = capability => {
      const sample = evidence.get(capability);
      if (!sample) return { usable: false, reason: "capability-evidence-missing", confidence: 0 };
      if (!sample.available) return { usable: false, reason: sample.reason, confidence: sample.confidence };
      if (sample.confidence < this.minCapabilityConfidence) {
        return { usable: false, reason: "capability-confidence-below-gate", confidence: sample.confidence };
      }
      for (const dependency of normalizeList(dependencies[capability])) {
        const dependencyState = capabilityState(dependency);
        if (!dependencyState.usable) {
          return { usable: false, reason: "dependency-unavailable:" + dependency, confidence: Math.min(sample.confidence, dependencyState.confidence) };
        }
      }
      return { usable: true, reason: sample.reason, confidence: sample.confidence };
    };

    const targetFrameMs = finite(input.targetFrameMs) && input.targetFrameMs > 0 ? input.targetFrameMs : null;
    const frameCostMs = finite(input.frameCostMs) && input.frameCostMs >= 0 ? input.frameCostMs : null;
    const frameRatio = targetFrameMs && frameCostMs !== null ? frameCostMs / targetFrameMs : null;
    const constrained = input.lowPower === true || input.performanceMode === "conserve" ||
      input.performanceMode === "light" || (frameRatio !== null && frameRatio >= this.overloadRatio);
    const remainingBudgetMs = targetFrameMs && frameCostMs !== null
      ? Math.max(0, targetFrameMs - frameCostMs) : null;

    const candidates = engines.map(engine => {
      const supported = engine.capabilities.map(capability => ({
        capability, ...capabilityState(capability), depth: capabilityDepth(capability)
      })).filter(item => item.usable && Number.isFinite(item.depth));
      const missingRequirements = engine.requiresCapabilities.filter(capability => !capabilityState(capability).usable);
      let action = "hold";
      let reason = "no-supported-capability-evidence";
      if (engine.enabled === false) reason = "engine-disabled";
      else if (missingRequirements.length) reason = "required-capability-unavailable:" + missingRequirements.join(",");
      else if (!supported.length) reason = engine.capabilities.length ? "capability-evidence-unavailable" : "engine-has-no-capability-contract";
      else if (constrained && engine.estimatedCostMs === null) reason = "cost-unknown-under-performance-constraint";
      else if (constrained && remainingBudgetMs !== null && engine.estimatedCostMs > remainingBudgetMs) reason = "estimated-cost-exceeds-remaining-frame-budget";
      else {
        action = "recommend";
        reason = engine.enabled === null ? "capability-supported-status-unknown-plan-only" : "capability-and-evidence-gates-passed";
      }
      return {
        ...engine,
        action,
        reason,
        matchedCapabilities: supported.map(item => item.capability),
        dependencyDepth: supported.length ? Math.max(...supported.map(item => item.depth)) : -1,
        confidence: supported.length ? Math.min(...supported.map(item => item.confidence)) : 0
      };
    }).sort((a, b) => a.dependencyDepth - b.dependencyDepth || b.priority - a.priority || a.id.localeCompare(b.id));

    const selected = [];
    for (const candidate of candidates) {
      if (candidate.action !== "recommend") continue;
      const conflict = selected.find(item => candidate.conflictsWith.includes(item.id) || item.conflictsWith.includes(candidate.id));
      if (conflict) {
        candidate.action = "hold";
        candidate.reason = "engine-conflict-with:" + conflict.id;
        continue;
      }
      selected.push(candidate);
    }

    const steps = selected.map((engine, index) => ({
      order: index + 1,
      engine: engine.id,
      name: engine.name,
      capabilities: engine.matchedCapabilities,
      confidence: engine.confidence,
      estimatedCostMs: engine.estimatedCostMs,
      status: engine.statusAvailable ? (engine.enabled === false ? "disabled" : "status-known") : "status-unknown"
    }));
    this.lastPlan = {
      status: steps.length ? "recommendation-ready" : "no-safe-pipeline",
      mode: constrained ? "conservative" : "balanced",
      frameRatio,
      remainingBudgetMs,
      selectedEngineCount: steps.length,
      steps,
      decisions: candidates.map(engine => ({
        engine: engine.id,
        action: engine.action,
        reason: engine.reason,
        matchedCapabilities: engine.matchedCapabilities
      })),
      executionPerformed: false
    };
    return this.getPlan();
  }

  getPlan() {
    return {
      ...this.lastPlan,
      steps: this.lastPlan.steps.map(item => ({ ...item, capabilities: [...item.capabilities] })),
      decisions: this.lastPlan.decisions.map(item => ({ ...item, matchedCapabilities: [...item.matchedCapabilities] }))
    };
  }

  reset() {
    this.lastPlan = {
      status: "no-evaluation", mode: "unknown", frameRatio: null,
      remainingBudgetMs: null, selectedEngineCount: 0, steps: [],
      decisions: [], executionPerformed: false
    };
  }
}
