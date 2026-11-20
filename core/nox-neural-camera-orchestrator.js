import { NOXMultiEngineIntelligenceBrain } from "./nox-multi-engine-intelligence-brain.js";

const finite = value => Number.isFinite(value);
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * NOX Neural Camera Orchestrator.
 * "Neural" is the product name, not a claim of a trained neural network.
 * This is a deterministic, session-only adaptive controller using measured
 * render costs. It recommends changes; it never changes camera settings.
 */
export class NOXNeuralCameraOrchestrator {
  constructor({
    historySize = 12,
    minSamples = 4,
    overloadRatio = 0.92,
    recoveryRatio = 0.68,
    decisionCooldownFrames = 12
  } = {}) {
    this.options = {
      historySize: Number.isInteger(historySize) ? Math.max(6, Math.min(48, historySize)) : 12,
      minSamples: Number.isInteger(minSamples) ? Math.max(3, Math.min(12, minSamples)) : 4,
      overloadRatio: finite(overloadRatio) ? Math.max(0.5, Math.min(2, overloadRatio)) : 0.92,
      recoveryRatio: finite(recoveryRatio) ? Math.max(0.2, Math.min(0.9, recoveryRatio)) : 0.68,
      decisionCooldownFrames: Number.isInteger(decisionCooldownFrames) ? Math.max(1, Math.min(120, decisionCooldownFrames)) : 12
    };
    this.brain = new NOXMultiEngineIntelligenceBrain();
    this.reset();
  }

  observeFrame({ frameCostMs, targetFrameMs } = {}) {
    if (!finite(frameCostMs) || frameCostMs < 0 ||
        !finite(targetFrameMs) || targetFrameMs <= 0) {
      return this.getMemoryStatus();
    }
    const ratio = frameCostMs / targetFrameMs;
    if (!finite(ratio)) return this.getMemoryStatus();
    this.history.push({ ratio, frameCostMs, targetFrameMs });
    if (this.cooldownRemaining > 0) this.cooldownRemaining -= 1;
    if (this.history.length > this.options.historySize) this.history.shift();
    return this.getMemoryStatus();
  }

  getAdaptiveRecommendation({ lowPower = false, currentTier = 0 } = {}) {
    const recent = this.history.slice(-6);
    const ratios = recent.map(sample => sample.ratio);
    const overloadWindow = ratios.slice(-4);
    const overloadSamples = overloadWindow.filter(value => value >= this.options.overloadRatio).length;
    const stableSamples = ratios.filter(value => value <= this.options.recoveryRatio).length;
    const medianFrameRatio = median(ratios);
    const sampleCount = this.history.length;
    const base = {
      sampleCount,
      historyLimit: this.options.historySize,
      cooldownRemaining: this.cooldownRemaining,
      medianFrameRatio,
      overloadSamples,
      stableSamples,
      confidence: Math.min(1, sampleCount / this.options.minSamples),
      action: "hold",
      reason: sampleCount < this.options.minSamples ? "insufficient-measured-frames" : "no-stable-performance-pattern"
    };

    if (sampleCount < this.options.minSamples) return base;
    if (this.cooldownRemaining > 0) {
      return { ...base, reason: "decision-cooldown-active" };
    }
    if (overloadSamples >= 3) {
      return { ...base, action: "recommend-reduce-load", reason: "repeated-frame-budget-overload" };
    }
    if (recent.length >= 6 && stableSamples >= 5) {
      const minimumTier = lowPower ? 1 : 0;
      if (!Number.isInteger(currentTier) || currentTier <= minimumTier) {
        return { ...base, action: "hold", reason: "already-at-minimum-quality-tier" };
      }
      return { ...base, action: "recommend-one-tier-recovery", reason: "sustained-frame-budget-headroom" };
    }
    return base;
  }

  commitAdaptiveDecision(action) {
    if (action !== "recommend-reduce-load" && action !== "recommend-one-tier-recovery") {
      return { accepted: false, reason: "unsupported-adaptive-decision" };
    }
    this.cooldownRemaining = this.options.decisionCooldownFrames;
    return { accepted: true, cooldownRemaining: this.cooldownRemaining, action };
  }

  evaluate(input = {}) {
    const plan = this.brain.evaluate(input);
    return {
      ...plan,
      adaptiveMemory: this.getAdaptiveRecommendation({
        lowPower: input.lowPower === true,
        currentTier: input.currentQualityTier
      })
    };
  }

  getMemoryStatus() {
    return {
      sampleCount: this.history.length,
      historyLimit: this.options.historySize,
      cooldownRemaining: this.cooldownRemaining,
      medianFrameRatio: median(this.history.map(sample => sample.ratio))
    };
  }

  reset() {
    this.history = [];
    this.cooldownRemaining = 0;
    this.brain.reset();
  }
}
