/**
 * NOX MediaPipe Selfie Multiclass Provider v1
 *
 * Real on-device face-skin segmentation using Google's MediaPipe ImageSegmenter
 * and the selfie_multiclass_256x256 model.
 *
 * This model provides six classes: background, hair, body-skin, face-skin,
 * clothes and accessories. Only class 3 (face-skin) is exposed here.
 * It does NOT provide lips, eyelids, cheeks or brows as separate masks.
 *
 * The MediaPipe JS bundle and model are fetched from their official public
 * CDNs on first initialization. Camera frames are processed locally.
 */

const DEFAULTS = {
  packageVersion: "1.2.3",
  wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm",
  bundleUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs",
  modelUrl: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
  faceClassIndex: 3,
  maskThreshold: 0.45,
  minPixels: 24,
  maxInputDimension: 512
};

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function largestComponent(probabilities, width, height, threshold, minPixels) {
  const total = width * height;
  if (!probabilities || probabilities.length !== total) return null;
  const active = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    const value = Number(probabilities[i]);
    if (!finite(value) || value < 0 || value > 1) return null;
    if (value >= threshold) active[i] = 1;
  }

  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let best = null;

  for (let start = 0; start < total; start += 1) {
    if (!active[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    let sum = 0;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      sum += Number(probabilities[index]);

      const neighbors = [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1
      ];
      for (const next of neighbors) {
        if (next >= 0 && active[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    if (!best || tail > best.count) {
      best = { indices: queue.slice(0, tail), count: tail, left, top, right, bottom, sum };
    }
  }

  if (!best || best.count < minPixels) return null;
  const mask = new Float32Array(total);
  for (const index of best.indices) mask[index] = Number(probabilities[index]);
  return {
    data: mask,
    pixelCount: best.count,
    confidence: best.sum / best.count,
    // A small padded ROI is derived from the real mask bounds. It is not
    // presented as an independently detected face box; it provides context
    // around the segmented face pixels for downstream mask validation.
    bounds: (() => {
      const padX = Math.max(1, Math.ceil((best.right - best.left + 1) * 0.15));
      const padY = Math.max(1, Math.ceil((best.bottom - best.top + 1) * 0.15));
      const left = Math.max(0, best.left - padX);
      const top = Math.max(0, best.top - padY);
      const right = Math.min(width, best.right + 1 + padX);
      const bottom = Math.min(height, best.bottom + 1 + padY);
      return {
        x: left / width,
        y: top / height,
        width: (right - left) / width,
        height: (bottom - top) / height
      };
    })()
  };
}

export class NOXMediaPipeSelfieProvider {
  constructor({
    visionLoader = () => import(DEFAULTS.bundleUrl),
    wasmRoot = DEFAULTS.wasmRoot,
    modelUrl = DEFAULTS.modelUrl,
    delegate = "CPU",
    maskThreshold = DEFAULTS.maskThreshold,
    minPixels = DEFAULTS.minPixels,
    maxInputDimension = DEFAULTS.maxInputDimension
  } = {}) {
    this.visionLoader = visionLoader;
    this.wasmRoot = wasmRoot;
    this.modelUrl = modelUrl;
    this.delegate = delegate === "GPU" ? "GPU" : "CPU";
    this.maskThreshold = Math.min(1, Math.max(0, Number(maskThreshold)));
    this.minPixels = Math.max(1, Math.floor(Number(minPixels)));
    this.maxInputDimension = Math.max(64, Math.floor(Number(maxInputDimension)));
    this.segmenter = null;
    this.state = "idle";
    this.lastTimestamp = -1;
  }

  async initialize() {
    if (this.segmenter) return { available: true, state: "ready" };
    this.state = "loading";
    try {
      const vision = await this.visionLoader();
      const fileset = await vision.FilesetResolver.forVisionTasks(this.wasmRoot);
      this.segmenter = await vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: this.modelUrl,
          delegate: this.delegate
        },
        runningMode: "VIDEO",
        outputCategoryMask: false,
        outputConfidenceMasks: true
      });
      this.state = "ready";
      return {
        available: true,
        state: "ready",
        provider: "MediaPipe ImageSegmenter",
        model: "selfie_multiclass_256x256",
        delegate: this.delegate
      };
    } catch (error) {
      this.state = "unavailable";
      this.segmenter = null;
      return {
        available: false,
        state: "unavailable",
        reason: "mediapipe-model-load-failed",
        detail: String(error?.message || error).slice(0, 180)
      };
    }
  }

  segment({ source, width, height, frameId, timestamp } = {}) {
    if (this.state !== "ready" || !this.segmenter) {
      throw new Error("MediaPipe provider is not ready");
    }
    if (!source || !Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0 ||
        Math.max(width, height) > this.maxInputDimension ||
        !finite(timestamp) || timestamp <= this.lastTimestamp) {
      throw new Error("Invalid or oversized MediaPipe frame");
    }
    this.lastTimestamp = timestamp;

    const result = this.segmenter.segmentForVideo(source, timestamp);
    const masks = result?.confidenceMasks;
    const faceMask = masks?.[DEFAULTS.faceClassIndex];
    if (!faceMask || typeof faceMask.getAsFloat32Array !== "function") {
      for (const mask of masks || []) mask?.close?.();
      throw new Error("Face-skin confidence mask is unavailable");
    }

    let probabilities;
    let maskWidth = Number(faceMask.width);
    let maskHeight = Number(faceMask.height);
    try {
      probabilities = new Float32Array(faceMask.getAsFloat32Array());
    } finally {
      for (const mask of masks || []) mask?.close?.();
    }

    if (!Number.isInteger(maskWidth) || !Number.isInteger(maskHeight) ||
        maskWidth <= 0 || maskHeight <= 0 ||
        maskWidth !== width || maskHeight !== height ||
        probabilities.length !== width * height) {
      throw new Error("MediaPipe mask dimensions do not match the frame");
    }

    const component = largestComponent(
      probabilities, width, height, this.maskThreshold, this.minPixels
    );
    if (!component || !finite(component.confidence) || component.confidence < 0.5) {
      throw new Error("No confident face-skin region detected");
    }

    return {
      width,
      height,
      frameId,
      timestamp,
      source: "mediapipe-selfie-multiclass-face-skin",
      faceBox: component.bounds,
      skin: {
        data: component.data,
        confidence: component.confidence,
        className: "face-skin"
      },
      regions: {}
    };
  }

  async dispose() {
    const segmenter = this.segmenter;
    this.segmenter = null;
    this.state = "idle";
    this.lastTimestamp = -1;
    try { segmenter?.close?.(); } catch { /* safe resource cleanup */ }
  }
}

export const NOX_MEDIAPIPE_SELFIE_MODEL = Object.freeze({
  packageVersion: DEFAULTS.packageVersion,
  model: "selfie_multiclass_256x256",
  classIndex: DEFAULTS.faceClassIndex,
  className: "face-skin",
  inputLimit: DEFAULTS.maxInputDimension,
  delegate: "CPU",
  fineFacialRegionsAvailable: false
});
