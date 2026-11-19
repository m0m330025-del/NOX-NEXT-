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
  }
}
