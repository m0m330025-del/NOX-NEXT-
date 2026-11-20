/**
 * Computes a guarded roll delta between two frame-provenanced estimates.
 * This stage deliberately returns data only; the compositor is not rotated here.
 */
function wrapAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

export function calculateNOXFaceRollDelta({
  capturedRoll, currentRoll, nowMonotonicMs,
  maxAgeMs = 80, maxDeltaRadians = 0.35
} = {}) {
  const valid = estimate => estimate?.state === "estimated" &&
    Number.isFinite(estimate.angleRadians) &&
    estimate.frame &&
    typeof estimate.frame.id === "string" && estimate.frame.id.length > 0 &&
    Number.isFinite(estimate.frame.capturedAtMonotonicMs) &&
    Number.isInteger(estimate.frame.width) && estimate.frame.width > 0 &&
    Number.isInteger(estimate.frame.height) && estimate.frame.height > 0 &&
    typeof estimate.frame.coordinateSpace === "string" && estimate.frame.coordinateSpace.length > 0;
  if (!valid(capturedRoll) || !valid(currentRoll) ||
      !Number.isFinite(nowMonotonicMs) || !Number.isFinite(maxAgeMs) || maxAgeMs < 1 ||
      !Number.isFinite(maxDeltaRadians) || maxDeltaRadians <= 0 || maxDeltaRadians > Math.PI / 2) {
    return { state: "rejected", deltaRadians: null, reason: "invalid-roll-provenance" };
  }
  const a = capturedRoll.frame, b = currentRoll.frame;
  const currentAgeMs = nowMonotonicMs - b.capturedAtMonotonicMs;
  const capturedAgeMs = nowMonotonicMs - a.capturedAtMonotonicMs;
  if (currentAgeMs < 0 || currentAgeMs > maxAgeMs ||
      capturedAgeMs < 0 || capturedAgeMs > maxAgeMs) {
    return { state: "rejected", deltaRadians: null, reason: "stale-roll-measurement" };
  }
  const aspectA = a.width / a.height;
  const aspectB = b.width / b.height;
  if (a.coordinateSpace !== b.coordinateSpace ||
      !Number.isFinite(aspectA) || !Number.isFinite(aspectB) ||
      Math.abs(aspectA - aspectB) > 0.01) {
    return { state: "rejected", deltaRadians: null, reason: "roll-frame-mismatch" };
  }
  if (a.coordinateSpace !== "source-unmirrored-normalized") {
    return { state: "rejected", deltaRadians: null, reason: "unsupported-coordinate-space" };
  }
  const deltaRadians = wrapAngle(currentRoll.angleRadians - capturedRoll.angleRadians);
  if (!Number.isFinite(deltaRadians) || Math.abs(deltaRadians) > maxDeltaRadians) {
    return { state: "rejected", deltaRadians: null, reason: "roll-delta-exceeds-safe-limit" };
  }
  return {
    state: "accepted",
    deltaRadians,
    ageMs: currentAgeMs,
    sourceFrames: { captured: a.id, current: b.id },
    coordinateSpace: a.coordinateSpace
  };
}
