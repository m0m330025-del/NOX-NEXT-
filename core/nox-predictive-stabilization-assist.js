/**
 * NOX Predictive Stabilization Assist.
 * Converts measured sparse-flow motion plus a guarded short-horizon estimate
 * into a small, bounded correction. This is deterministic control logic,
 * not a learned model or a guarantee of physical camera stabilization.
 */
const finite = value => Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function calculateNOXPredictiveStabilizationCorrection({
  measuredDx,
  measuredDy,
  prediction,
  predictionAction,
  predictionConfidence,
  predictionHorizonMs,
  frameCostMs,
  targetFrameMs,
  measuredWeight = 0.72,
  predictionWeight = 0.18,
  minPredictionConfidence = 0.2,
  maxPredictionHorizonMs = 250,
  maxFrameRatio = 0.92,
  maxCorrection = 0.025
} = {}) {
  const safeMeasuredX = finite(measuredDx) ? measuredDx : 0;
  const safeMeasuredY = finite(measuredDy) ? measuredDy : 0;
  const safeMaxCorrection = finite(maxCorrection) ? clamp(maxCorrection, 0, 0.1) : 0.025;
  const safeMeasuredWeight = finite(measuredWeight) ? clamp(measuredWeight, 0, 1) : 0.72;
  const safePredictionWeight = finite(predictionWeight) ? clamp(predictionWeight, 0, 0.5) : 0.18;
  const frameRatio = finite(frameCostMs) && frameCostMs >= 0 &&
    finite(targetFrameMs) && targetFrameMs > 0
    ? frameCostMs / targetFrameMs
    : null;
  const budgetAllowsPrediction = frameRatio === null || frameRatio < maxFrameRatio;
  const predictionValid = predictionAction === "report-short-horizon-estimate" &&
    prediction && finite(prediction.dx) && finite(prediction.dy) &&
    finite(predictionConfidence) && predictionConfidence >= minPredictionConfidence &&
    finite(predictionHorizonMs) && predictionHorizonMs > 0 &&
    predictionHorizonMs <= maxPredictionHorizonMs && budgetAllowsPrediction;
  const predictiveDx = predictionValid ? prediction.dx * safePredictionWeight : 0;
  const predictiveDy = predictionValid ? prediction.dy * safePredictionWeight : 0;

  return {
    dx: clamp(safeMeasuredX * safeMeasuredWeight + predictiveDx, -safeMaxCorrection, safeMaxCorrection),
    dy: clamp(safeMeasuredY * safeMeasuredWeight + predictiveDy, -safeMaxCorrection, safeMaxCorrection),
    predictionUsed: Boolean(predictionValid),
    frameRatio,
    reason: predictionValid
      ? "measured-motion-plus-trusted-prediction"
      : !budgetAllowsPrediction
        ? "frame-budget-protection"
        : "measured-motion-only"
  };
}
