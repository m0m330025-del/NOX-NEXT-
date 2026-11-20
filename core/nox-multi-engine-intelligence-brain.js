/**
 * NOX Multi-Engine Intelligence Brain.
 * Deterministically coordinates existing camera engines from measured inputs.
 * It recommends safe execution paths; it never invents sensor data or forces
 * an engine to run. The camera adapter remains responsible for execution.
 */
const clamp01 = value => Math.max(0, Math.min(1, value));
const finite = value => Number.isFinite(value);

export class NOXMultiEngineIntelligenceBrain {
  constructor({ staleFlowMs = 700, overloadedFrameRatio = 0.92, criticalFrameRatio = 1.25 } = {}) {
    this.options = { staleFlowMs, overloadedFrameRatio, criticalFrameRatio };
    this.reset();
  }

  evaluate(input = {}) {
    const lowPower = input.lowPower === true;
    const targetFrameMs = finite(input.targetFrameMs) && input.targetFrameMs > 0 ? input.targetFrameMs : 33.3;
    const frameCostMs = finite(input.frameCostMs) && input.frameCostMs >= 0 ? input.frameCostMs : null;
    const frameRatio = frameCostMs === null ? null : frameCostMs / targetFrameMs;
    const flow = input.opticalFlow || {};
    const motion = input.motion || {};
    const temporal = input.temporal || {};
    const alignment = input.alignment || {};
    const flowAgeMs = finite(flow.ageMs) && flow.ageMs >= 0 ? flow.ageMs : null;
    const flowFresh = flow.enabled === true && flowAgeMs !== null && flowAgeMs <= this.options.staleFlowMs;
    const flowUsable = flowFresh && Number.isInteger(flow.vectorCount) &&
      flow.vectorCount >= 4 && finite(flow.confidence) && flow.confidence >= 0.06;
    const globalMotionUsable = flowUsable && motion.accepted === true &&
      finite(motion.confidence) && motion.confidence >= 0.14 &&
      finite(motion.backgroundRatio) && motion.backgroundRatio >= 0.55;
    const alignmentUsable = globalMotionUsable && Number.isInteger(alignment.validSlots) &&
      alignment.validSlots > 0 && alignment.lastAccepted &&
      finite(alignment.lastAccepted.confidence) && alignment.lastAccepted.confidence >= 0.22;
    const overloaded = frameRatio !== null && frameRatio >= this.options.overloadedFrameRatio;
    const critical = frameRatio !== null && frameRatio >= this.options.criticalFrameRatio;

    let performanceMode = "balanced";
    let performanceReason = "measured-frame-cost-within-budget";
    if (critical || (lowPower && overloaded)) {
      performanceMode = "conserve";
      performanceReason = critical ? "frame-cost-exceeds-critical-budget" : "low-power-device-over-budget";
    } else if (overloaded) {
      performanceMode = "light";
      performanceReason = "frame-cost-near-or-over-budget";
    } else if (frameRatio === null) {
      performanceMode = lowPower ? "conserve" : "unknown";
      performanceReason = lowPower ? "low-power-hint-without-frame-cost" : "frame-cost-not-measured";
    }

    const pipeline = [];
    const decisions = [];
    if (flow.enabled === true) {
      decisions.push({ engine: "optical-flow", action: flowUsable ? "usable" : "hold", reason:
        !flowFresh ? (flowAgeMs === null ? "flow-age-unavailable" : "flow-sample-stale-or-disabled") :
        !flowUsable ? "insufficient-flow-vectors-or-confidence" : "fresh-confident-flow-sample" });
      if (flowUsable) pipeline.push("optical-flow");
    } else {
      decisions.push({ engine: "optical-flow", action: "inactive", reason: "optical-flow-disabled" });
    }

    decisions.push({ engine: "motion-separation", action: globalMotionUsable ? "allow-global-consensus" : "hold",
      reason: !flowUsable ? "reliable-flow-unavailable" :
        motion.accepted !== true ? (motion.reason || "global-motion-consensus-rejected") :
        !finite(motion.confidence) || motion.confidence < 0.14 ? "motion-confidence-too-low" :
        !finite(motion.backgroundRatio) || motion.backgroundRatio < 0.55 ? "background-consensus-too-small" :
        "dominant-global-motion-confirmed" });
    if (globalMotionUsable) pipeline.push("motion-separation");

    decisions.push({ engine: "temporal-alignment", action: alignmentUsable ? "allow-aligned-history" : "invalidate-history-use",
      reason: !globalMotionUsable ? "global-motion-evidence-unavailable" :
        !Number.isInteger(alignment.validSlots) || alignment.validSlots < 1 ? "no-valid-alignment-slots" :
        !alignment.lastAccepted || !finite(alignment.lastAccepted.confidence) ||
        alignment.lastAccepted.confidence < 0.22 ? "alignment-confidence-too-low" : "alignment-evidence-valid" });
    if (alignmentUsable) pipeline.push("temporal-alignment");

    const temporalAllowed = temporal.enabled === true && alignmentUsable;
    decisions.push({ engine: "temporal-fusion", action: temporal.enabled !== true ? "inactive" :
      temporalAllowed ? "allow-evidence-gated-fusion" : "protect-live-frame",
      reason: temporal.enabled !== true ? "temporal-mode-disabled" :
        !globalMotionUsable ? "global-motion-evidence-unavailable" :
        !alignmentUsable ? "no-trusted-aligned-history" : "motion-and-alignment-evidence-valid" });
    if (temporalAllowed) pipeline.push("temporal-fusion");

    if (performanceMode === "conserve" || performanceMode === "light") {
      decisions.push({ engine: "quality-governor", action: "recommend-lower-cost-profile", reason: performanceReason });
    } else {
      decisions.push({ engine: "quality-governor", action: "keep-current-profile", reason: performanceReason });
    }

    this.lastPlan = {
      performanceMode, performanceReason, frameRatio,
      pipeline, decisions,
      status: temporalAllowed ? "coordinated-evidence-ready" :
        temporal.enabled === true ? "live-frame-protected" : "analysis-only"
    };
    return this.getPlan();
  }

  getPlan() {
    return {
      ...this.lastPlan,
      pipeline: [...this.lastPlan.pipeline],
      decisions: this.lastPlan.decisions.map(item => ({ ...item }))
    };
  }

  reset() {
    this.lastPlan = {
      performanceMode: "unknown",
      performanceReason: "no-evaluation",
      frameRatio: null,
      pipeline: [],
      decisions: [],
      status: "no-evaluation"
    };
  }
}
