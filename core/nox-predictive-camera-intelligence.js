/**
 * NOX Predictive Camera Intelligence.
 * Short-horizon, one-sample-ahead motion estimator from measured sparse flow.
 * This is deterministic kinematic extrapolation, not a trained AI model.
 * It never creates pixels or changes camera/render settings.
 */
const finite = value => Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export class NOXPredictiveCameraIntelligence {
  constructor({
    historySize = 4,
    minVectors = 4,
    minVectorConfidence = 0.12,
    minConsensusRatio = 0.55,
    maxResidual = 0.018,
    maxSampleAgeMs = 700,
    maxSampleIntervalMs = 600,
    maxPredictionHorizonMs = 250,
    maxPredictionDisplacement = 0.06,
    minPredictionConfidence = 0.12
  } = {}) {
    this.options = {
      historySize: Number.isInteger(historySize) ? clamp(historySize, 2, 8) : 4,
      minVectors: Number.isInteger(minVectors) ? clamp(minVectors, 4, 64) : 4,
      minVectorConfidence: finite(minVectorConfidence) ? clamp(minVectorConfidence, 0, 1) : 0.12,
      minConsensusRatio: finite(minConsensusRatio) ? clamp(minConsensusRatio, 0.5, 1) : 0.55,
      maxResidual: finite(maxResidual) ? clamp(maxResidual, 0.001, 0.1) : 0.018,
      maxSampleAgeMs: finite(maxSampleAgeMs) ? clamp(maxSampleAgeMs, 100, 3000) : 700,
      maxSampleIntervalMs: finite(maxSampleIntervalMs) ? clamp(maxSampleIntervalMs, 50, 2000) : 600,
      maxPredictionHorizonMs: finite(maxPredictionHorizonMs) ? clamp(maxPredictionHorizonMs, 30, 500) : 250,
      maxPredictionDisplacement: finite(maxPredictionDisplacement) ? clamp(maxPredictionDisplacement, 0.005, 0.2) : 0.06,
      minPredictionConfidence: finite(minPredictionConfidence) ? clamp(minPredictionConfidence, 0, 1) : 0.12
    };
    this.reset();
  }

  observe({ vectors, timestampMs, sequence } = {}) {
    if (!finite(timestampMs) || timestampMs < 0 || !Array.isArray(vectors) ||
        !Number.isInteger(sequence) || sequence < 0) {
      return { accepted: false, reason: "invalid-flow-observation" };
    }
    if (this.history.length && (timestampMs <= this.history[this.history.length - 1].timestampMs ||
        sequence <= this.history[this.history.length - 1].sequence)) {
      return { accepted: false, reason: "stale-or-duplicate-flow-observation" };
    }

    const usable = vectors.filter(vector =>
      vector && finite(vector.dx) && finite(vector.dy) &&
      finite(vector.confidence) && vector.confidence >= this.options.minVectorConfidence &&
      Math.abs(vector.dx) <= 0.2 && Math.abs(vector.dy) <= 0.2
    );
    if (usable.length < this.options.minVectors) {
      return { accepted: false, reason: "insufficient-confident-flow-vectors" };
    }

    const centerX = median(usable.map(vector => vector.dx));
    const centerY = median(usable.map(vector => vector.dy));
    const inliers = usable.filter(vector =>
      Math.hypot(vector.dx - centerX, vector.dy - centerY) <= this.options.maxResidual
    );
    const consensusRatio = inliers.length / usable.length;
    const meanVectorConfidence = inliers.length
      ? inliers.reduce((sum, vector) => sum + vector.confidence, 0) / inliers.length
      : 0;
    if (consensusRatio < this.options.minConsensusRatio ||
        meanVectorConfidence < this.options.minVectorConfidence) {
      return { accepted: false, reason: "conflicting-or-low-confidence-flow" };
    }

    const previous = this.history[this.history.length - 1];
    if (previous && timestampMs - previous.timestampMs > this.options.maxSampleIntervalMs) {
      this.history = [];
    }
    this.history.push({
      timestampMs,
      sequence,
      dx: median(inliers.map(vector => vector.dx)),
      dy: median(inliers.map(vector => vector.dy)),
      consensusRatio,
      meanVectorConfidence,
      vectorCount: inliers.length
    });
    if (this.history.length > this.options.historySize) this.history.shift();
    return { accepted: true, reason: "flow-consensus-recorded", ...this.getStatus(timestampMs) };
  }

  evaluate({ nowMs, frameCostMs, targetFrameMs } = {}) {
    const status = this.getStatus(nowMs);
    const frameRatio = finite(frameCostMs) && frameCostMs >= 0 &&
      finite(targetFrameMs) && targetFrameMs > 0
      ? frameCostMs / targetFrameMs
      : null;
    if (frameRatio !== null && frameRatio >= 0.92) {
      return {
        ...status,
        prediction: null,
        frameRatio,
        action: "defer-prediction-analysis",
        reason: "frame-budget-protection"
      };
    }
    if (!status.prediction) {
      return {
        ...status,
        frameRatio,
        action: "hold",
        reason: status.reason
      };
    }
    return {
      ...status,
      frameRatio,
      action: "report-short-horizon-estimate",
      reason: "fresh-consistent-flow-and-bounded-horizon"
    };
  }

  getStatus(nowMs) {
    const last = this.history[this.history.length - 1];
    if (!last) return {
      sampleCount: 0, prediction: null, confidence: 0,
      horizonMs: null, reason: "insufficient-flow-history"
    };
    if (!finite(nowMs) || nowMs < last.timestampMs ||
        nowMs - last.timestampMs > this.options.maxSampleAgeMs) {
      return {
        sampleCount: this.history.length, prediction: null, confidence: 0,
        horizonMs: null, reason: "flow-sample-stale-or-clock-invalid"
      };
    }
    if (this.history.length < 2) return {
      sampleCount: this.history.length, prediction: null, confidence: 0,
      horizonMs: null, reason: "need-two-timed-flow-samples"
    };

    const current = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];
    const intervalMs = current.timestampMs - previous.timestampMs;
    if (intervalMs <= 0 || intervalMs > this.options.maxSampleIntervalMs) {
      return {
        sampleCount: this.history.length, prediction: null, confidence: 0,
        horizonMs: null, reason: "flow-interval-out-of-range"
      };
    }
    const intervalSec = intervalMs / 1000;
    const velocityX = current.dx / intervalSec;
    const velocityY = current.dy / intervalSec;
    const previousVelocityX = previous.dx / intervalSec;
    const previousVelocityY = previous.dy / intervalSec;
    const accelerationX = (velocityX - previousVelocityX) / intervalSec;
    const accelerationY = (velocityY - previousVelocityY) / intervalSec;
    const horizonMs = Math.min(intervalMs, this.options.maxPredictionHorizonMs);
    const horizonSec = horizonMs / 1000;
    let predictedX = velocityX * horizonSec + 0.5 * accelerationX * horizonSec * horizonSec;
    let predictedY = velocityY * horizonSec + 0.5 * accelerationY * horizonSec * horizonSec;
    const magnitude = Math.hypot(predictedX, predictedY);
    if (magnitude > this.options.maxPredictionDisplacement) {
      const scale = this.options.maxPredictionDisplacement / magnitude;
      predictedX *= scale;
      predictedY *= scale;
    }

    const previousMagnitude = Math.hypot(previousVelocityX, previousVelocityY);
    const currentMagnitude = Math.hypot(velocityX, velocityY);
    const directionDot = previousMagnitude > 0.0001 && currentMagnitude > 0.0001
      ? (previousVelocityX * velocityX + previousVelocityY * velocityY) /
        (previousMagnitude * currentMagnitude)
      : 1;
    const turnPenalty = directionDot < -0.2 ? 0.45 : directionDot < 0.25 ? 0.72 : 1;
    const confidence = clamp(
      current.meanVectorConfidence * current.consensusRatio * turnPenalty *
      Math.min(1, this.history.length / 3), 0, 1
    );
    if (confidence < this.options.minPredictionConfidence) return {
      sampleCount: this.history.length, prediction: null, confidence,
      horizonMs, reason: "prediction-confidence-too-low"
    };
    return {
      sampleCount: this.history.length,
      prediction: { dx: predictedX, dy: predictedY },
      velocity: { x: velocityX, y: velocityY },
      acceleration: { x: accelerationX, y: accelerationY },
      confidence,
      consensusRatio: current.consensusRatio,
      vectorCount: current.vectorCount,
      horizonMs,
      reason: "fresh-consistent-flow-and-bounded-horizon"
    };
  }

  reset() {
    this.history = [];
  }
}
