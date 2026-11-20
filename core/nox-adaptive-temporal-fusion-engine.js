/**
 * NOX Adaptive Temporal Fusion Engine
 * Chooses safe historical layers using alignment and dominant-motion evidence.
 * Pixel compositing remains in the camera adapter.
 */
const clamp01 = value => Math.max(0, Math.min(1, value));

export class NOXAdaptiveTemporalFusionEngine {
  constructor({
    minAlignmentConfidence = 0.22,
    minMotionConfidence = 0.14,
    minBackgroundRatio = 0.55,
    ageDecay = 0.24,
    minLayerWeight = 0.12,
    maxLayerAge = 4
  } = {}) {
    this.options = {
      minAlignmentConfidence, minMotionConfidence, minBackgroundRatio,
      ageDecay, minLayerWeight, maxLayerAge
    };
    this.reset();
  }

  plan({ layers = [], alignments = [], motion = null, mode = "time-echo" } = {}) {
    const alignmentByIndex = new Map(alignments.map(item => [item.index, item]));
    const motionValid = Boolean(
      motion?.accepted &&
      Number.isFinite(motion.confidence) &&
      motion.confidence >= this.options.minMotionConfidence &&
      Number.isFinite(motion.backgroundRatio) &&
      motion.backgroundRatio >= this.options.minBackgroundRatio
    );
    const selected = [];
    const rejected = [];
    if (!motionValid) {
      for (const layer of layers) rejected.push({ index: layer.index, reason: "global-motion-evidence-unavailable" });
      this.lastStatus = { accepted: false, reason: "global-motion-evidence-unavailable", selectedCount: 0, rejectedCount: rejected.length };
      return { layers: selected, rejected, status: { ...this.lastStatus } };
    }

    for (const layer of layers) {
      const alignment = alignmentByIndex.get(layer.index);
      if (!Number.isFinite(layer.age) || layer.age < 1 || layer.age > this.options.maxLayerAge) {
        rejected.push({ index: layer.index, reason: "layer-age-out-of-range" });
        continue;
      }
      if (!alignment?.valid || !Number.isFinite(alignment.confidence) ||
          alignment.confidence < this.options.minAlignmentConfidence) {
        rejected.push({ index: layer.index, reason: "alignment-confidence-too-low" });
        continue;
      }
      const ageFactor = Math.exp(-this.options.ageDecay * (layer.age - 1));
      const evidence = clamp01(alignment.confidence) *
        clamp01(motion.confidence) *
        clamp01(motion.backgroundRatio) *
        ageFactor;
      const alpha = clamp01(layer.alpha * evidence);
      if (!Number.isFinite(alpha) || alpha < this.options.minLayerWeight) {
        rejected.push({ index: layer.index, reason: "fusion-weight-too-low" });
        continue;
      }
      selected.push({
        ...layer,
        alpha,
        fusionWeight: evidence,
        alignmentConfidence: alignment.confidence,
        motionConfidence: motion.confidence,
        ageFactor
      });
    }
    this.lastStatus = {
      accepted: selected.length > 0,
      reason: selected.length ? "evidence-weighted-layers-selected" : "no-layer-passed-evidence-gates",
      selectedCount: selected.length,
      rejectedCount: rejected.length,
      meanWeight: selected.length
        ? selected.reduce((sum, layer) => sum + layer.fusionWeight, 0) / selected.length
        : 0
    };
    return { layers: selected, rejected, status: { ...this.lastStatus } };
  }

  getStatus() {
    return { ...this.lastStatus };
  }

  reset() {
    this.lastStatus = {
      accepted: false,
      reason: "no-fusion-decision",
      selectedCount: 0,
      rejectedCount: 0,
      meanWeight: 0
    };
  }
}
