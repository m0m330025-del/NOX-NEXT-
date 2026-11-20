/**
 * NOX Multi-Model Face Fusion Provider.
 * Combines genuine BiSeNet semantic masks with MediaPipe landmarks for the
 * same source frame. It never fabricates missing outputs and fails closed on
 * dimension/frame mismatches.
 */
import { NOXFaceLandmarksEngine } from "./nox-face-landmarks-engine.js";

function validBox(box) {
  return box && [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
    box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
    box.x + box.width <= 1 && box.y + box.height <= 1;
}
function boxFromLandmarkAnalysis(analysis) {
  const points = analysis?.regions?.faceOval?.points;
  if (!Array.isArray(points) || points.length < 8) return null;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const right = Math.max(...xs), bottom = Math.max(...ys);
  const box = { x: left, y: top, width: right - left, height: bottom - top };
  return validBox(box) ? box : null;
}
function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x), top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

export class NOXMultiModelFaceFusionProvider {
  constructor({ segmentationProvider, landmarkProvider, landmarksEngine = new NOXFaceLandmarksEngine(),
    minFaceBoxIoU = 0.2, requireLandmarks = false } = {}) {
    if (!segmentationProvider || typeof segmentationProvider.segment !== "function") {
      throw new TypeError("fusion-segmentation-provider-required");
    }
    if (!landmarkProvider || typeof landmarkProvider.detect !== "function") {
      throw new TypeError("fusion-landmark-provider-required");
    }
    if (!Number.isFinite(minFaceBoxIoU) || minFaceBoxIoU < 0 || minFaceBoxIoU > 1) {
      throw new RangeError("invalid-fusion-face-overlap-threshold");
    }
    this.segmentationProvider = segmentationProvider;
    this.landmarkProvider = landmarkProvider;
    this.landmarksEngine = landmarksEngine;
    this.minFaceBoxIoU = minFaceBoxIoU;
    this.requireLandmarks = Boolean(requireLandmarks);
    this.state = "idle";
    this.sequence = 0;
  }

  async initialize() {
    this.state = "loading";
    const [segmentation, landmarks] = await Promise.allSettled([
      this.segmentationProvider.initialize?.() ?? { available: true },
      this.landmarkProvider.initialize?.() ?? { available: true }
    ]);
    const segmentationReady = segmentation.status === "fulfilled" && segmentation.value?.available !== false;
    const landmarksReady = landmarks.status === "fulfilled" && landmarks.value?.available !== false;
    this.state = segmentationReady && (landmarksReady || !this.requireLandmarks) ? "ready" : "unavailable";
    return {
      available: this.state === "ready",
      state: this.state,
      segmentationAvailable: segmentationReady,
      landmarksAvailable: landmarksReady,
      fusionMode: segmentationReady && landmarksReady ? "dual-model" : "segmentation-only"
    };
  }

  async segment(frame = {}) {
    if (this.state !== "ready") throw new Error("fusion-provider-not-ready");
    const sequence = ++this.sequence;
    const [segmentationResult, landmarkResult] = await Promise.allSettled([
      this.segmentationProvider.segment(frame),
      Promise.resolve().then(() => this.landmarkProvider.detect(frame.source))
    ]);
    if (sequence !== this.sequence) throw new Error("superseded-fusion-frame");
    if (segmentationResult.status !== "fulfilled") throw segmentationResult.reason;
    const segmentation = segmentationResult.value;
    if (!segmentation || segmentation.width !== frame.width || segmentation.height !== frame.height ||
        segmentation.frameId !== frame.frameId || segmentation.timestamp !== frame.timestamp ||
        !validBox(segmentation.faceBox)) throw new Error("fusion-segmentation-frame-mismatch");

    let landmarkAnalysis = null, landmarkBox = null, alignmentIoU = null;
    let landmarkStatus = "unavailable";
    if (landmarkResult.status === "fulfilled" && landmarkResult.value?.detected) {
      const detected = landmarkResult.value;
      if (detected.width === frame.width && detected.height === frame.height) {
        landmarkAnalysis = this.landmarksEngine.analyze(detected);
        landmarkBox = boxFromLandmarkAnalysis(landmarkAnalysis);
        if (landmarkBox) {
          alignmentIoU = intersectionOverUnion(segmentation.faceBox, landmarkBox);
          if (alignmentIoU >= this.minFaceBoxIoU) landmarkStatus = "aligned";
          else { landmarkAnalysis = null; landmarkBox = null; landmarkStatus = "alignment-rejected"; }
        }
      } else landmarkStatus = "dimension-mismatch";
    } else if (landmarkResult.status === "rejected") {
      landmarkStatus = "landmark-inference-failed";
    }

    if (this.requireLandmarks && landmarkStatus !== "aligned") {
      throw new Error("required-landmark-fusion-unavailable");
    }
    return {
      ...segmentation,
      fusion: {
        state: landmarkStatus === "aligned" ? "fused" : "partial",
        segmentationSource: segmentation.source,
        landmarkSource: landmarkAnalysis?.source || null,
        landmarkStatus,
        alignmentIoU
      },
      landmarks: landmarkAnalysis,
      landmarkFaceBox: landmarkBox
    };
  }

  async dispose() {
    this.sequence += 1;
    this.state = "idle";
    await Promise.allSettled([
      this.segmentationProvider.dispose?.(),
      this.landmarkProvider.dispose?.()
    ]);
  }
}
