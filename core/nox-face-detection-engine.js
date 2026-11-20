/**
 * NOX Face Detection Adapter v1
 *
 * Uses the browser's experimental FaceDetector API only when available.
 * It reports only geometry and landmarks explicitly returned by the platform.
 * It never invents facial landmarks, identity, skin masks, or face confidence.
 *
 * This is a detection adapter, NOT a complete facial-landmark or tracking engine.
 */

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function normalizeRect(rect, width, height) {
  if (!rect || !(width > 0) || !(height > 0)) return null;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const w = Number(rect.width);
  const h = Number(rect.height);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;

  const left = clamp01(x / width);
  const top = clamp01(y / height);
  const right = clamp01((x + w) / width);
  const bottom = clamp01((y + h) / height);
  if (right <= left || bottom <= top) return null;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

function normalizeLandmarks(landmarks, width, height) {
  if (!Array.isArray(landmarks)) return [];
  const normalized = [];
  for (const landmark of landmarks) {
    const locations = Array.isArray(landmark?.locations) ? landmark.locations : [];
    const points = locations
      .map((point) => {
        const x = Number(point?.x);
        const y = Number(point?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x: clamp01(x / width), y: clamp01(y / height) };
      })
      .filter(Boolean);
    if (points.length) {
      normalized.push({
        type: typeof landmark.type === "string" ? landmark.type : "unspecified",
        points
      });
    }
  }
  return normalized;
}

export class NOXFaceDetectionEngine {
  constructor({ detectorFactory } = {}) {
    this.detectorFactory = detectorFactory ?? (() => {
      if (typeof globalThis.FaceDetector !== "function") return null;
      return new globalThis.FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
    });
    this.detector = null;
    this.state = "idle";
  }

  get available() {
    return typeof this.detectorFactory === "function";
  }

  async initialize() {
    try {
      this.detector = this.detectorFactory();
      this.state = this.detector ? "ready" : "unsupported";
    } catch {
      this.detector = null;
      this.state = "unsupported";
    }
    return { state: this.state, available: Boolean(this.detector) };
  }

  async detect(source) {
    if (!this.detector) {
      return { state: this.state === "idle" ? "not-initialized" : "unsupported", faces: [] };
    }
    const width = Number(source?.videoWidth || source?.naturalWidth || source?.width);
    const height = Number(source?.videoHeight || source?.naturalHeight || source?.height);
    if (!(width > 0) || !(height > 0)) {
      return { state: "invalid-source", faces: [] };
    }

    try {
      const detections = await this.detector.detect(source);
      const faces = (Array.isArray(detections) ? detections : [])
        .map((item) => {
          const box = normalizeRect(item?.boundingBox, width, height);
          if (!box) return null;
          return {
            box,
            landmarks: normalizeLandmarks(item?.landmarks, width, height),
            landmarkDataProvided: Array.isArray(item?.landmarks) && item.landmarks.length > 0
          };
        })
        .filter(Boolean);
      return {
        state: "ok",
        source: "platform-face-detector",
        frame: { width, height },
        faces
      };
    } catch {
      return { state: "detection-error", faces: [] };
    }
  }

  reset() {
    this.detector = null;
    this.state = "idle";
  }
}
