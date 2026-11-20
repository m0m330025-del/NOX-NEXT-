/**
 * NOX CORTEX — adaptive engine orchestration (planning layer).
 * It selects and orders registered engines; it does not execute or fabricate engine output.
 */

const MODES = Object.freeze({
  lite: { maxCost: 3, maxEngines: 3 },
  balanced: { maxCost: 7, maxEngines: 6 },
  quality: { maxCost: 12, maxEngines: 10 }
});

const DEFAULT_ENGINES = [
  { id: "face-detection", group: "face", cost: 1, priority: 100, tags: ["face"], when: c => c.faceRequested === true },
  { id: "face-tracking", group: "face", cost: 1, priority: 90, requires: ["face-detection"], tags: ["face", "motion"], when: c => c.faceRequested === true && c.motion === true },
  { id: "face-landmarks", group: "face", cost: 2, priority: 95, tags: ["face", "geometry"], when: c => c.faceRequested === true && c.landmarksRequested === true },
  { id: "facial-mask-builder", group: "face", cost: 1, priority: 80, requires: ["face-landmarks"], tags: ["face", "mask"], when: c => c.maskRequested === true },
  { id: "skin-segmentation", group: "beauty", cost: 3, priority: 65, tags: ["face", "skin"], when: c => c.skinRequested === true },
  { id: "makeup-rendering", group: "beauty", cost: 2, priority: 70, requires: ["facial-mask-builder"], tags: ["face", "makeup"], enabled: false, when: c => c.makeupRequested === true },
  { id: "optical-flow", group: "motion", cost: 2, priority: 75, tags: ["motion"], when: c => c.motion === true },
  { id: "temporal-memory", group: "motion", cost: 2, priority: 60, requires: ["optical-flow"], tags: ["motion", "temporal"], when: c => c.temporalRequested === true },
  { id: "motion-prediction", group: "motion", cost: 1, priority: 55, requires: ["optical-flow"], tags: ["motion"], when: c => c.motionPrediction === true },
  { id: "smart-stabilizer", group: "motion", cost: 1, priority: 50, requires: ["optical-flow"], tags: ["motion"], when: c => c.stabilization === true },
  { id: "low-light-rescue", group: "image", cost: 2, priority: 85, tags: ["image", "light"], when: c => c.lowLight === true },
  { id: "detail-recovery", group: "image", cost: 2, priority: 45, tags: ["image", "detail"], when: c => c.detailRecovery === true },
  { id: "wave-matter", group: "effects", cost: 2, priority: 30, tags: ["effect"], when: c => c.waveMatter === true },
  { id: "science-optics", group: "effects", cost: 2, priority: 25, tags: ["effect"], when: c => c.scienceOptics === true },
  { id: "photon-temporal-fusion", group: "temporal", cost: 4, priority: 35, tags: ["temporal", "image"], when: c => c.photonFusion === true },
  { id: "filter-render", group: "filter", cost: 1, priority: 40, tags: ["filter"], when: c => c.filterSelected === true }
];

function normalizeEngine(engine) {
  if (!engine || typeof engine.id !== "string" || !engine.id.trim()) {
    throw new TypeError("engine.id must be a non-empty string");
  }
  if (!Number.isFinite(engine.cost) || engine.cost < 0) {
    throw new TypeError("engine.cost must be a finite non-negative number");
  }
  return {
    ...engine,
    id: engine.id.trim(),
    cost: engine.cost,
    priority: Number.isFinite(engine.priority) ? engine.priority : 0,
    requires: Array.isArray(engine.requires) ? [...new Set(engine.requires)] : [],
    tags: Array.isArray(engine.tags) ? [...new Set(engine.tags)] : [],
    conflictsWith: Array.isArray(engine.conflictsWith) ? [...new Set(engine.conflictsWith)] : [],
    enabled: engine.enabled !== false
  };
}

export class NOXCortex {
  constructor({ engines = DEFAULT_ENGINES, mode = "balanced" } = {}) {
    this.engines = new Map();
    this.mode = MODES[mode] ? mode : "balanced";
    this.telemetry = new Map();
    this.lastPlan = null;
    for (const engine of engines) this.registerEngine(engine);
  }

  registerEngine(engine) {
    const normalized = normalizeEngine(engine);
    if (this.engines.has(normalized.id)) throw new Error("duplicate-engine-id:" + normalized.id);
    this.engines.set(normalized.id, normalized);
    return normalized.id;
  }

  unregisterEngine(id) {
    if (!this.engines.has(id)) return false;
    this.engines.delete(id);
    this.telemetry.delete(id);
    this.lastPlan = null;
    return true;
  }

  setEngineEnabled(id, enabled) {
    const engine = this.engines.get(id);
    if (!engine) return false;
    engine.enabled = Boolean(enabled);
    return true;
  }

  setMode(mode) {
    if (!MODES[mode]) throw new RangeError("unsupported-cortex-mode:" + mode);
    this.mode = mode;
    return this.mode;
  }

  recordOutcome(id, { durationMs, success = true } = {}) {
    if (!this.engines.has(id)) return false;
    const previous = this.telemetry.get(id) || { samples: 0, averageDurationMs: null, failures: 0 };
    const validDuration = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null;
    const averageDurationMs = validDuration === null
      ? previous.averageDurationMs
      : previous.averageDurationMs === null ? validDuration : previous.averageDurationMs * 0.75 + validDuration * 0.25;
    this.telemetry.set(id, {
      samples: previous.samples + 1,
      averageDurationMs,
      failures: previous.failures + (success ? 0 : 1)
    });
    return true;
  }

  plan(context = {}, options = {}) {
    const mode = options.mode || this.mode;
    const budget = MODES[mode];
    if (!budget) throw new RangeError("unsupported-cortex-mode:" + mode);
    const requested = new Set(Array.isArray(options.requested) ? options.requested : []);
    const candidates = new Set();

    for (const engine of this.engines.values()) {
      let wanted = requested.has(engine.id);
      if (!wanted && typeof engine.when === "function") {
        try { wanted = engine.when(context) === true; } catch { wanted = false; }
      }
      if (wanted && engine.enabled) candidates.add(engine.id);
    }

    const rejected = [];
    const invalidDependencies = new Set();
    const addDependencies = (id, visiting = new Set()) => {
      const engine = this.engines.get(id);
      if (!engine || !engine.enabled) {
        rejected.push({ id, reason: engine ? "engine-disabled" : "unknown-engine" });
        return false;
      }
      if (visiting.has(id)) {
        for (const member of visiting) invalidDependencies.add(member);
        invalidDependencies.add(id);
        rejected.push({ id, reason: "dependency-cycle" });
        return false;
      }
      visiting.add(id);
      for (const dependency of engine.requires) {
        if (!this.engines.has(dependency) || !this.engines.get(dependency).enabled) {
          invalidDependencies.add(id);
          rejected.push({ id, reason: "dependency-unavailable", dependency });
          visiting.delete(id);
          return false;
        }
        if (!candidates.has(dependency)) candidates.add(dependency);
        if (!addDependencies(dependency, visiting)) {
          invalidDependencies.add(id);
          visiting.delete(id);
          return false;
        }
      }
      visiting.delete(id);
      return true;
    };

    for (const id of [...candidates]) addDependencies(id);
    for (const id of invalidDependencies) candidates.delete(id);

    const ordered = [];
    const visited = new Set();
    const visiting = new Set();
    const visit = id => {
      if (visited.has(id) || visiting.has(id)) return;
      const engine = this.engines.get(id);
      if (!engine || !candidates.has(id) || !engine.enabled) return;
      visiting.add(id);
      for (const dependency of engine.requires) visit(dependency);
      visiting.delete(id);
      visited.add(id);
      ordered.push(engine);
    };
    [...candidates].forEach(visit);

    const requestedRoots = [...candidates].filter(id => {
      const engine = this.engines.get(id);
      return engine && (requested.has(id) || (typeof engine.when === "function" && engine.when(context) === true));
    });
    const rootsByPriority = requestedRoots
      .map(id => this.engines.get(id))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    const selected = new Set();
    const result = [];
    let totalCost = 0;
    const addWithDependencies = engine => {
      if (selected.has(engine.id)) return true;
      const chain = [];
      const collect = item => {
        if (selected.has(item.id) || chain.some(entry => entry.id === item.id)) return true;
        for (const depId of item.requires) {
          const dep = this.engines.get(depId);
          if (!dep || !dep.enabled || !collect(dep)) return false;
        }
        chain.push(item);
        return true;
      };
      if (!collect(engine)) {
        rejected.push({ id: engine.id, reason: "dependency-unavailable" });
        return false;
      }
      if (!chain.length && selected.has(engine.id)) return true;
      let conflict = null;
      for (let index = 0; index < chain.length && !conflict; index += 1) {
        const item = chain[index];
        const alreadySelected = [...selected].map(id => this.engines.get(id)).filter(Boolean);
        const priorInChain = chain.slice(0, index);
        const other = [...alreadySelected, ...priorInChain].find(candidate =>
          item.conflictsWith.includes(candidate.id) || candidate.conflictsWith.includes(item.id)
        );
        if (other) conflict = { engine: item.id, with: other.id };
      }
      if (conflict) {
        rejected.push({ id: engine.id, reason: "engine-conflict", conflict: conflict.with });
        return false;
      }
      const cost = chain.reduce((sum, item) => sum + item.cost, 0);
      if (result.length + chain.length > budget.maxEngines || totalCost + cost > budget.maxCost) {
        rejected.push({ id: engine.id, reason: "resource-budget-exceeded" });
        return false;
      }
      for (const item of chain) {
        if (selected.has(item.id)) continue;
        selected.add(item.id);
        result.push(item);
        totalCost += item.cost;
      }
      return true;
    };

    rootsByPriority.forEach(addWithDependencies);
    const plan = {
      state: "planned",
      mode,
      engines: result.map(({ id, group, cost, requires, tags, conflictsWith }) => ({ id, group, cost, requires: [...requires], tags: [...tags], conflictsWith: [...conflictsWith] })),
      totalCost,
      budget: { maxCost: budget.maxCost, maxEngines: budget.maxEngines },
      rejected,
      execution: "not-started"
    };
    this.lastPlan = plan;
    return plan;
  }

  async execute(plan, input, handlers = {}, options = {}) {
    if (!plan || plan.state !== "planned" || !Array.isArray(plan.engines)) {
      throw new TypeError("a valid NOX CORTEX plan is required");
    }
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 5000;
    const externalSignal = options.signal;
    const results = [];
    const completed = new Set();
    const failed = new Set();
    let current = input;
    let stopped = false;

    for (const planned of plan.engines) {
      if (externalSignal?.aborted) {
        stopped = true;
        results.push({ id: planned.id, status: "cancelled", reason: "execution-aborted" });
        break;
      }
      const unmet = (planned.requires || []).filter(id => !completed.has(id));
      if (unmet.length) {
        failed.add(planned.id);
        results.push({ id: planned.id, status: "skipped", reason: "dependency-not-completed", dependencies: unmet });
        continue;
      }
      const handler = handlers[planned.id];
      if (typeof handler !== "function") {
        failed.add(planned.id);
        results.push({ id: planned.id, status: "skipped", reason: "handler-not-registered" });
        continue;
      }

      const controller = new AbortController();
      let timeoutId;
      let externalAbortHandler;
      const startedAt = Date.now();
      try {
        const task = Promise.resolve().then(() => handler(current, {
          engineId: planned.id,
          context: options.context || {},
          previousResults: results.slice(),
          signal: controller.signal
        }));
        const timeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error("engine-timeout"));
          }, timeoutMs);
        });
        const abort = new Promise((_, reject) => {
          if (!externalSignal) return;
          externalAbortHandler = () => {
            controller.abort();
            reject(new Error("execution-aborted"));
          };
          externalSignal.addEventListener("abort", externalAbortHandler, { once: true });
          if (externalSignal.aborted) externalAbortHandler();
        });
        const output = await Promise.race([task, timeout, abort]);
        if (output === undefined) throw new Error("engine-returned-undefined");
        current = output;
        completed.add(planned.id);
        const durationMs = Math.max(0, Date.now() - startedAt);
        this.recordOutcome(planned.id, { durationMs, success: true });
        results.push({ id: planned.id, status: "success", durationMs });
      } catch (error) {
        controller.abort();
        const durationMs = Math.max(0, Date.now() - startedAt);
        if (error?.message === "execution-aborted") {
          stopped = true;
          results.push({ id: planned.id, status: "cancelled", reason: "execution-aborted" });
          break;
        }
        failed.add(planned.id);
        this.recordOutcome(planned.id, { durationMs, success: false });
        results.push({
          id: planned.id,
          status: "failed",
          reason: error?.message === "engine-timeout" ? "timeout" : "handler-error"
        });
        if (options.stopOnError === true) {
          stopped = true;
          break;
        }
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (externalAbortHandler) externalSignal.removeEventListener("abort", externalAbortHandler);
      }
    }

    const summary = {
      state: stopped ? "stopped" : failed.size ? "completed-with-errors" : "completed",
      execution: "finished",
      results,
      completed: [...completed],
      failed: [...failed],
      output: current
    };
    this.lastExecution = summary;
    return summary;
  }

  getStatus() {
    return {
      mode: this.mode,
      registeredEngines: this.engines.size,
      lastPlan: this.lastPlan,
      lastExecution: this.lastExecution || null,
      telemetry: Object.fromEntries(this.telemetry)
    };
  }
}

export function createNOXCortex(options = {}) {
  return new NOXCortex(options);
}

export const NOX_CORTEX_MODES = Object.freeze(Object.keys(MODES));
