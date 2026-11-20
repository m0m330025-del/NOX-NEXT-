/**
 * Estimates in-plane face roll from genuine MediaPipe eye-region landmarks.
 * Coordinates remain normalized to the source frame; no points are synthesized.
 */
function centerOf(region, landmarkCount) {
  const points = region?.points;
  if (!Array.isArray(points) || points.length < 3) return null;
  const unique = new Map();
  for (const point of points) {
    if (!Number.isInteger(point?.index) || point.index < 0 || point.index >= landmarkCount ||
        !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
    unique.set(point.index, point);
  }
  if (unique.size < 3) return null;
  const values = [...unique.values()];
  return {
    x: values.reduce((sum, point) => sum + point.x, 0) / values.length,
    y: values.reduce((sum, point) => sum + point.y, 0) / values.length
  };
}

export function estimateNOXFaceRoll(landmarksAnalysis) {
  if (landmarksAnalysis?.source !== "mediapipe-face-landmarker-478" ||
      !Number.isInteger(landmarksAnalysis.width) || landmarksAnalysis.width < 1 ||
      !Number.isInteger(landmarksAnalysis.height) || landmarksAnalysis.height < 1 ||
      !Number.isInteger(landmarksAnalysis.landmarkCount) || landmarksAnalysis.landmarkCount < 468) {
    return { state: "unavailable", angleRadians: null, reason: "invalid-landmark-frame" };
  }
  const left = centerOf(landmarksAnalysis.regions?.leftEye, landmarksAnalysis.landmarkCount);
  const right = centerOf(landmarksAnalysis.regions?.rightEye, landmarksAnalysis.landmarkCount);
  if (!left || !right) {
    return { state: "unavailable", angleRadians: null, reason: "insufficient-eye-landmarks" };
  }
  const dx = (right.x - left.x) * landmarksAnalysis.width;
  const dy = (right.y - left.y) * landmarksAnalysis.height;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < Math.min(landmarksAnalysis.width, landmarksAnalysis.height) * 0.04) {
    return { state: "unavailable", angleRadians: null, reason: "degenerate-eye-baseline" };
  }
  return {
    state: "estimated",
    angleRadians: Math.atan2(dy, dx),
    source: "mediapipe-eye-region-centroids",
    frame: { width: landmarksAnalysis.width, height: landmarksAnalysis.height }
  };
}
