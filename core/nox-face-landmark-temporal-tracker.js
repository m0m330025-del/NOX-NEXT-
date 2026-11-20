/**
 * NOX Face Landmark Temporal Tracker.
 * Smooths only observed MediaPipe points and holds a short coasting window.
 * It never fabricates landmarks or assigns semantic-mask confidence.
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function validLandmarks(result) {
  return result?.detected === true &&
    result.source === "mediapipe-face-landmarker-478" &&
    Array.isArray(result.landmarks) && result.landmarks.length >= 468 &&
    Number.isInteger(result.width) && result.width > 0 &&
    Number.isInteger(result.height) && result.height > 0 &&
    result.landmarks.every(point => point &&
      Number.isFinite(point.x) && point.x >= 0 && point.x <= 1 &&
      Number.isFinite(point.y) && point.y >= 0 && point.y <= 1 &&
      Number.isFinite(point.z ?? 0));
}

function faceBounds(result) {
  const graph = result.connections?.faceOval;
  const indices = new Set();
  if (Array.isArray(graph) && graph.length) {
    for (const edge of graph) {
      if (Number.isInteger(edge?.start)) indices.add(edge.start);
      if (Number.isInteger(edge?.end)) indices.add(edge.end);
    }
  }
  const points = indices.size >= 8
    ? [...indices].map(index => result.landmarks[index]).filter(Boolean)
    : result.landmarks;
  if (points.length < 8) return null;
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  const width = right - left;
  const height = bottom - top;
  if (!Number.isFinite(width) || !Number.isFinite(height) ||
      width < 0.04 || height < 0.04 || width > 0.95 || height > 0.95) return null;
  return { x: left, y: top, width, height };
}

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export class NOXFaceLandmarkTemporalTracker {
  constructor({ smoothing = 0.58, maxMissedFrames = 2, maxJump = 0.22 } = {}) {
    this.smoothing = clamp(Number(smoothing) || 0.58, 0.05, 1);
    this.maxMissedFrames = Math.max(1, Math.floor(Number(maxMissedFrames) || 2));
    this.maxJump = clamp(Number(maxJump) || 0.22, 0.05, 0.6);
    this.previous = null;
    this.box = null;
    this.missed = 0;
    this.sequence = 0;
  }

  update(result) {
    this.sequence += 1;
    if (!validLandmarks(result)) return this.miss("invalid-or-missing-landmarks");
    const nextBox = faceBounds(result);
    if (!nextBox) return this.miss("invalid-face-bounds");

    const nextCenter = center(nextBox);
    const previousCenter = this.box ? center(this.box) : null;
    const jumped = previousCenter &&
      Math.hypot(nextCenter.x - previousCenter.x, nextCenter.y - previousCenter.y) > this.maxJump;
    const reacquired = !this.previous || jumped || this.missed > 0;
    const alpha = reacquired ? 1 : this.smoothing;
    const landmarks = result.landmarks.map((point, index) => {
      const previous = this.previous?.landmarks?.[index];
      if (!previous || alpha >= 1) return { x: point.x, y: point.y, z: point.z ?? 0 };
      return {
        x: previous.x * (1 - alpha) + point.x * alpha,
        y: previous.y * (1 - alpha) + point.y * alpha,
        z: previous.z * (1 - alpha) + (point.z ?? 0) * alpha
      };
    });
    const box = !this.box || reacquired ? nextBox : {
      x: this.box.x * (1 - alpha) + nextBox.x * alpha,
      y: this.box.y * (1 - alpha) + nextBox.y * alpha,
      width: this.box.width * (1 - alpha) + nextBox.width * alpha,
      height: this.box.height * (1 - alpha) + nextBox.height * alpha
    };
    this.previous = { ...result, landmarks };
    this.box = box;
    this.missed = 0;
    return {
      state: reacquired ? "acquired" : "tracking",
      sequence: this.sequence,
      face: { box: { ...box }, landmarks },
      result: this.previous,
      missedFrames: 0,
      reacquired: Boolean(jumped)
    };
  }

  miss(reason = "face-not-detected") {
    this.missed += 1;
    if (!this.previous || this.missed > this.maxMissedFrames) {
      this.previous = null;
      this.box = null;
      return { state: "lost", sequence: this.sequence, face: null, result: null, missedFrames: this.missed, reason };
    }
    return {
      state: "coasting",
      sequence: this.sequence,
      face: { box: { ...this.box }, landmarks: this.previous.landmarks },
      result: this.previous,
      missedFrames: this.missed,
      reason
    };
  }

  reset() {
    this.previous = null;
    this.box = null;
    this.missed = 0;
    this.sequence = 0;
  }
}
