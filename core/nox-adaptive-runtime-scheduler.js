const finite = value => Number.isFinite(value);

const normalizeIds = value => Array.isArray(value)
  ? [...new Set(value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()))]
  : [];

export class NOXAdaptiveRuntimeScheduler {
  constructor({ normalReserveMs = 1.25, lowPowerReserveMs = 2.5 } = {}) {
    this.normalReserveMs = finite(normalReserveMs) ? Math.max(0, normalReserveMs) : 1.25;
    this.lowPowerReserveMs = finite(lowPowerReserveMs) ? Math.max(0, lowPowerReserveMs) : 2.5;
    this.lastSchedule = null;
  }

  evaluate({
    cortexPlan,
    runtimeSnapshot = [],
    targetFrameMs,
    frameCostMs = null,
    lowPower = false,
    brainRecommendedIds = []
  } = {}) {
    if (!cortexPlan || cortexPlan.state !== "planned" || !Array.isArray(cortexPlan.engines)) {
      throw new TypeError("valid-cortex-plan-required");
    }
    const target = finite(targetFrameMs) && targetFrameMs > 0 ? targetFrameMs : null;
    const frameCost = finite(frameCostMs) && frameCostMs >= 0 ? frameCostMs : null;
    const reserveMs = lowPower ? this.lowPowerReserveMs : this.normalReserveMs;
    const availableBudgetMs = target === null ? null
      : Math.max(0, target - (frameCost ?? 0) - reserveMs);
    const adapters = new Map();
    for (const item of Array.isArray(runtimeSnapshot) ? runtimeSnapshot : []) {
      if (item && typeof item.id === "string" && !adapters.has(item.id)) adapters.set(item.id, item);
    }
    const brainIds = new Set(normalizeIds(brainRecommendedIds));
    const scheduled = new Set();
    const rejected = [];
    const steps = [];
    let estimatedTotalMs = 0;

    for (const engine of cortexPlan.engines) {
      const id = engine?.id;
      if (typeof id !== "string" || !id) continue;
      const adapter = adapters.get(id);
      let reason = "measured-runtime-budget-eligible";
      let durationMs = null;
      if (!adapter || adapter.connected !== true) reason = "adapter-not-connected";
      else if (adapter.enabled !== true) reason = "adapter-disabled";
      else if (adapter.state === "running") reason = "adapter-already-running";
      else if ((engine.requires || []).some(dependency => !scheduled.has(dependency))) reason = "dependency-not-runtime-eligible";
      else if (scheduled.size && [...scheduled].some(selectedId =>
        normalizeIds(engine.conflictsWith).includes(selectedId) ||
        normalizeIds(cortexPlan.engines.find(item => item.id === selectedId)?.conflictsWith).includes(id)
      )) reason = "runtime-engine-conflict";
      else if (!finite(adapter.measuredP95Ms) || adapter.measuredP95Ms < 0) reason = "measured-p95-not-available";
      else if (availableBudgetMs === null) reason = "frame-budget-unavailable";
      else if (estimatedTotalMs + adapter.measuredP95Ms > availableBudgetMs) reason = "measured-p95-exceeds-remaining-frame-budget";
      else durationMs = adapter.measuredP95Ms;

      const eligible = reason === "measured-runtime-budget-eligible";
      if (eligible) {
        scheduled.add(id);
        estimatedTotalMs += durationMs;
      } else {
        rejected.push({ id, reason });
      }
      steps.push({
        id,
        order: steps.length + 1,
        eligible,
        reason,
        measuredP95Ms: finite(adapter?.measuredP95Ms) ? adapter.measuredP95Ms : null,
        brainRecommended: brainIds.has(id)
      });
    }

    this.lastSchedule = {
      state: steps.some(step => step.eligible) ? "recommendation-ready" : "no-safe-schedule",
      mode: lowPower ? "low-power-conservative" : "balanced",
      targetFrameMs: target,
      frameCostMs: frameCost,
      reserveMs,
      availableBudgetMs,
      estimatedTotalMs,
      eligibleEngineIds: [...scheduled],
      eligibleCount: scheduled.size,
      heldCount: rejected.length,
      steps,
      rejected,
      brainRecommendedEngineIds: [...brainIds],
      executionPerformed: false
    };
    return this.getSchedule();
  }

  getSchedule() {
    if (!this.lastSchedule) {
      return {
        state: "no-evaluation", mode: "unknown", targetFrameMs: null,
        frameCostMs: null, reserveMs: null, availableBudgetMs: null,
        estimatedTotalMs: 0, eligibleEngineIds: [], eligibleCount: 0,
        heldCount: 0, steps: [], rejected: [],
        brainRecommendedEngineIds: [], executionPerformed: false
      };
    }
    return {
      ...this.lastSchedule,
      eligibleEngineIds: [...this.lastSchedule.eligibleEngineIds],
      steps: this.lastSchedule.steps.map(step => ({ ...step })),
      rejected: this.lastSchedule.rejected.map(item => ({ ...item })),
      brainRecommendedEngineIds: [...this.lastSchedule.brainRecommendedEngineIds]
    };
  }

  reset() {
    this.lastSchedule = null;
  }
}
