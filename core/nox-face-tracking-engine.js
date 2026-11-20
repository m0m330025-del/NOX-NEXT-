/**
 * NOX Face Tracking Engine v1
 *
 * Associates platform-provided face rectangles across frames using geometry only.
 * It does not identify people, infer landmarks, or claim biometric identity.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function iou(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}


function validLandmarkResult(result) {
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

function landmarkFaceBounds(result) {
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

function associationScore(previous, next) {
  const a = center(previous);
  const b = center(next);
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  const scale = Math.max(0.08, Math.hypot(previous.width, previous.height));
  const proximity = clamp(1 - distance / (scale * 2.5), 0, 1);
  return Math.max(iou(previous, next), proximity * 0.72);
}

export class NOXFaceTrackingEngine {
  constructor({ maxMissedFrames = 3, smoothing = 0.62, minAssociation = 0.18 } = {}) {
    this.maxMissedFrames = Math.max(1, Math.floor(maxMissedFrames));
    this.smoothing = clamp(Number(smoothing) || 0.62, 0, 1);
    this.minAssociation = clamp(Number(minAssociation) || 0.18, 0, 1);
    this.track = null;
    this.sequence = 0;
    this.landmarkTrack = null;
    this.landmarkSequence = 0;
  }

  update(detections = []) {
    this.sequence += 1;
    const faces = Array.isArray(detections)
      ? detections.filter((face) => face?.box &&
          [face.box.x, face.box.y, face.box.width, face.box.height].every(Number.isFinite) &&
          face.box.width > 0 && face.box.height > 0)
      : [];

    if (!this.track) {
      if (!faces.length) return { state: "lost", face: null, sequence: this.sequence };
      const first = faces[0];
      this.track = { box: { ...first.box }, landmarks: first.landmarks || [], missed: 0, hits: 1 };
      return this.snapshot("acquired");
    }

    let best = null;
    let bestScore = -1;
    for (const face of faces) {
      const score = associationScore(this.track.box, face.box);
      if (score > bestScore) {
        best = face;
        bestScore = score;
      }
    }

    if (!best || bestScore < this.minAssociation) {
      this.track.missed += 1;
      if (this.track.missed > this.maxMissedFrames) {
        this.track = null;
        return { state: "lost", face: null, sequence: this.sequence };
      }
      return this.snapshot("coasting");
    }

    const alpha = this.smoothing;
    const previous = this.track.box;
    const box = {};
    for (const key of ["x", "y", "width", "height"]) {
      box[key] = previous[key] * (1 - alpha) + best.box[key] * alpha;
    }
    this.track = {
      box,
      landmarks: Array.isArray(best.landmarks) ? best.landmarks : [],
      missed: 0,
      hits: this.track.hits + 1
    };
    return this.snapshot("tracking");
  }


  // Landmark tracking shares the same lifecycle, smoothing policy and loss
  // handling as rectangle tracking while keeping provider-specific state isolated.
  updateLandmarks(result) {
    this.landmarkSequence += 1;
    if (!validLandmarkResult(result)) return this.missLandmarks("invalid-or-missing-landmarks");
    const nextBox = landmarkFaceBounds(result);
    if (!nextBox) return this.missLandmarks("invalid-face-bounds");

    const previous = this.landmarkTrack;
    const nextCenter = center(nextBox);
    const previousCenter = previous ? center(previous.box) : null;
    const jumpDistance = previousCenter
      ? Math.hypot(nextCenter.x - previousCenter.x, nextCenter.y - previousCenter.y)
      : 0;
    const jumped = Boolean(previousCenter && jumpDistance > 0.22);

    // A large one-frame displacement can be a detector hand-off to another
    // person. Confirm it on a second consecutive frame before switching tracks.
    if (previous && jumped) {
      const pending = previous.pendingJump;
      const pendingCenter = pending ? center(pending.box) : null;
      const pendingDistance = pendingCenter
        ? Math.hypot(nextCenter.x - pendingCenter.x, nextCenter.y - pendingCenter.y)
        : Infinity;
      if (!pending || pendingDistance > 0.16) {
        previous.pendingJump = { box: nextBox, result, hits: 1 };
        return {
          state: "coasting",
          sequence: this.landmarkSequence,
          face: { box: { ...previous.box }, landmarks: previous.result.landmarks },
          result: previous.result,
          missedFrames: previous.missed,
          reason: "unconfirmed-large-displacement"
        };
      }
      previous.pendingJump.hits += 1;
      this.landmarkTrack = null;
      return this.updateConfirmedLandmarkReacquisition(result, nextBox);
    }

    if (previous?.pendingJump) previous.pendingJump = null;
    const reacquired = !previous || previous.missed > 0;
    const alpha = reacquired ? 1 : this.smoothing;
    const landmarks = result.landmarks.map((point, index) => {
      const oldPoint = previous?.result?.landmarks?.[index];
      if (!oldPoint || alpha >= 1) return { x: point.x, y: point.y, z: point.z ?? 0 };
      return {
        x: oldPoint.x * (1 - alpha) + point.x * alpha,
        y: oldPoint.y * (1 - alpha) + point.y * alpha,
        z: oldPoint.z * (1 - alpha) + (point.z ?? 0) * alpha
      };
    });
    const box = !previous || reacquired ? nextBox : {
      x: previous.box.x * (1 - alpha) + nextBox.x * alpha,
      y: previous.box.y * (1 - alpha) + nextBox.y * alpha,
      width: previous.box.width * (1 - alpha) + nextBox.width * alpha,
      height: previous.box.height * (1 - alpha) + nextBox.height * alpha
    };
    const trackedResult = { ...result, landmarks };
    this.landmarkTrack = { box, result: trackedResult, missed: 0, pendingJump: null };
    return {
      state: reacquired ? "acquired" : "tracking",
      sequence: this.landmarkSequence,
      face: { box: { ...box }, landmarks },
      result: trackedResult,
      missedFrames: 0,
      reacquired: Boolean(jumped)
    };
  }

  updateConfirmedLandmarkReacquisition(result, nextBox) {
    const trackedResult = { ...result, landmarks: result.landmarks.map(point => ({ ...point })) };
    this.landmarkTrack = { box: { ...nextBox }, result: trackedResult, missed: 0, pendingJump: null };
    return {
      state: "acquired",
      sequence: this.landmarkSequence,
      face: { box: { ...nextBox }, landmarks: trackedResult.landmarks },
      result: trackedResult,
      missedFrames: 0,
      reacquired: true,
      reason: "confirmed-large-displacement"
    };
  }

  missLandmarks(reason = "face-not-detected") {
    if (!this.landmarkTrack) {
      return { state: "lost", sequence: this.landmarkSequence, face: null, result: null, missedFrames: 1, reason };
    }
    this.landmarkTrack.pendingJump = null;
    this.landmarkTrack.missed += 1;
    if (this.landmarkTrack.missed > this.maxMissedFrames) {
      const missedFrames = this.landmarkTrack.missed;
      this.landmarkTrack = null;
      return { state: "lost", sequence: this.landmarkSequence, face: null, result: null, missedFrames, reason };
    }
    return {
      state: "coasting",
      sequence: this.landmarkSequence,
      face: { box: { ...this.landmarkTrack.box }, landmarks: this.landmarkTrack.result.landmarks },
      result: this.landmarkTrack.result,
      missedFrames: this.landmarkTrack.missed,
      reason
    };
  }

  resetLandmarks() {
    this.landmarkTrack = null;
    this.landmarkSequence = 0;
  }

  snapshot(state) {
    if (!this.track) return { state: "lost", face: null, sequence: this.sequence };
    return {
      state,
      sequence: this.sequence,
      face: {
        box: { ...this.track.box },
        landmarks: this.track.landmarks,
        landmarkDataProvided: this.track.landmarks.length > 0
      },
      consecutiveHits: this.track.hits,
      missedFrames: this.track.missed
    };
  }

  reset() {
    this.track = null;
    this.sequence = 0;
    this.resetLandmarks();
  }
}
