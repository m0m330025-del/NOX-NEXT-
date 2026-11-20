/**
 * NOX BiSeNet Face Parsing Provider v1
 *
 * Real 19-class facial semantic segmentation using the MIT-licensed
 * yakhyo/face-parsing BiSeNet ResNet-18 ONNX export.
 *
 * Supported semantic makeup masks: lips (upper/lower) and brows (left/right).
 * This model has no cheek-only or eyelid-only classes. Those regions remain
 * unavailable; skin/eye pixels are never relabelled as cheeks/eyelids.
 *
 * ONNX Runtime and model weights load lazily. Camera frames stay in-browser.
 */
const DEFAULTS = Object.freeze({
  modelUrl: "https://github.com/yakhyo/face-parsing/releases/download/weights/resnet18.onnx",
  runtimeUrl: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.mjs",
  modelInputSize: 512,
  classCount: 19,
  maxInputDimension: 512,
  minRegionPixels: 2
});
const CLASS_IDS = Object.freeze({ skin: [1], brows: [2, 3], lips: [12, 13] });

function finite(value) { return typeof value === "number" && Number.isFinite(value); }
function validFrame(frame, maxDimension) {
  return Boolean(frame?.source) && Number.isInteger(frame.width) && frame.width > 0 &&
    Number.isInteger(frame.height) && frame.height > 0 &&
    Math.max(frame.width, frame.height) <= maxDimension && finite(frame.timestamp);
}
function defaultCanvasFactory() {
  if (typeof document !== "undefined" && document.createElement) return document.createElement("canvas");
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
  throw new Error("canvas-unavailable");
}
function preprocessCanvasFrame(source, width, height, size, canvasFactory) {
  const canvas = canvasFactory();
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2d-context-unavailable");

  // Preserve the source aspect ratio. Padding is filled with the RGB ImageNet
  // mean so the normalized padding becomes approximately zero.
  const scale = Math.min(size / width, size / height);
  const contentWidth = Math.max(1, Math.min(size, Math.round(width * scale)));
  const contentHeight = Math.max(1, Math.min(size, Math.round(height * scale)));
  const offsetX = Math.floor((size - contentWidth) / 2);
  const offsetY = Math.floor((size - contentHeight) / 2);
  context.fillStyle = "rgb(124,116,104)";
  context.fillRect(0, 0, size, size);
  context.drawImage(source, offsetX, offsetY, contentWidth, contentHeight);

  const pixels = context.getImageData(0, 0, size, size).data;
  const input = new Float32Array(3 * size * size);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const plane = size * size;
  for (let i = 0; i < plane; i += 1) {
    input[i] = (pixels[i * 4] / 255 - mean[0]) / std[0];
    input[plane + i] = (pixels[i * 4 + 1] / 255 - mean[1]) / std[1];
    input[plane * 2 + i] = (pixels[i * 4 + 2] / 255 - mean[2]) / std[2];
  }
  input.noxLetterbox = { x: offsetX, y: offsetY, width: contentWidth, height: contentHeight };
  return input;
}
function cropLetterboxed(source, sourceWidth, sourceHeight, rect) {
  const x = Math.max(0, Math.min(sourceWidth - 1, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(sourceHeight - 1, Math.floor(rect.y)));
  const right = Math.max(x + 1, Math.min(sourceWidth, Math.ceil(rect.x + rect.width)));
  const bottom = Math.max(y + 1, Math.min(sourceHeight, Math.ceil(rect.y + rect.height)));
  const width = right - x, height = bottom - y;
  const output = new source.constructor(width * height);
  for (let row = 0; row < height; row += 1) {
    const start = (y + row) * sourceWidth + x;
    output.set(source.subarray(start, start + width), row * width);
  }
  return { data: output, width, height };
}
function resizeBilinearFloat(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (sourceWidth === targetWidth && sourceHeight === targetHeight) return new Float32Array(source);
  const output = new Float32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    const sy = Math.max(0, Math.min(sourceHeight - 1, (y + 0.5) * sourceHeight / targetHeight - 0.5));
    const y0 = Math.floor(sy), y1 = Math.min(sourceHeight - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < targetWidth; x += 1) {
      const sx = Math.max(0, Math.min(sourceWidth - 1, (x + 0.5) * sourceWidth / targetWidth - 0.5));
      const x0 = Math.floor(sx), x1 = Math.min(sourceWidth - 1, x0 + 1), fx = sx - x0;
      const top = source[y0 * sourceWidth + x0] * (1 - fx) + source[y0 * sourceWidth + x1] * fx;
      const bottom = source[y1 * sourceWidth + x0] * (1 - fx) + source[y1 * sourceWidth + x1] * fx;
      output[y * targetWidth + x] = Math.max(0, Math.min(1, top * (1 - fy) + bottom * fy));
    }
  }
  return output;
}
function decodeLogits(logits, width, height, classCount) {
  const pixels = width * height;
  if (!logits || logits.length !== classCount * pixels) throw new Error("invalid-bisenet-output-shape");
  const labels = new Uint8Array(pixels), confidence = new Float32Array(pixels);
  const semanticIds = [1, 2, 3, 12, 13];
  const semanticProbabilities = new Map(semanticIds.map(id => [id, new Float32Array(pixels)]));
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    let maxLogit = -Infinity;
    for (let c = 0; c < classCount; c += 1) {
      const value = Number(logits[c * pixels + pixel]);
      if (!Number.isFinite(value)) throw new Error("non-finite-bisenet-logit");
      if (value > maxLogit) maxLogit = value;
    }
    let denominator = 0;
    for (let c = 0; c < classCount; c += 1) denominator += Math.exp(Number(logits[c * pixels + pixel]) - maxLogit);
    let bestClass = 0, bestProbability = -1;
    for (let c = 0; c < classCount; c += 1) {
      const probability = Math.exp(Number(logits[c * pixels + pixel]) - maxLogit) / denominator;
      if (probability > bestProbability) { bestProbability = probability; bestClass = c; }
      const semantic = semanticProbabilities.get(c);
      if (semantic) semantic[pixel] = probability;
    }
    labels[pixel] = bestClass;
    confidence[pixel] = bestProbability;
  }
  return { labels, confidence, semanticProbabilities };
}
function makeRegionMask(probabilities, width, height, targetWidth, targetHeight) {
  if (!probabilities || probabilities.length !== width * height) return null;
  let activeCount = 0, confidenceSum = 0;
  for (let i = 0; i < probabilities.length; i += 1) {
    const probability = probabilities[i];
    if (probability >= 0.5) { activeCount += 1; confidenceSum += probability; }
  }
  if (activeCount < DEFAULTS.minRegionPixels) return null;
  const data = resizeBilinearFloat(probabilities, width, height, targetWidth, targetHeight);
  // Suppress numerical softmax residue outside the semantic region while
  // retaining genuine fractional probabilities along interpolated edges.
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] < 0.05) data[i] = 0;
  }
  return { data, confidence: confidenceSum / activeCount };
}
function combineClassProbabilities(probabilities, ids, winningLabels) {
  const first = probabilities.get(ids[0]);
  if (!first || !winningLabels || winningLabels.length !== first.length) return null;
  const selectedIds = new Set(ids);
  const combined = new Float32Array(first.length);
  for (let i = 0; i < combined.length; i += 1) {
    // Prevent low-probability tails from tinting unrelated semantic regions.
    if (!selectedIds.has(winningLabels[i])) continue;
    let value = 0;
    for (const id of ids) value += probabilities.get(id)?.[i] || 0;
    combined[i] = Math.min(1, value);
  }
  return combined;
}
function faceBounds(labels, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let i = 0; i < labels.length; i += 1) {
    if (labels[i] !== 1) continue;
    const x = i % width, y = Math.floor(i / width);
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return null;
  return { x: left / width, y: top / height, width: (right - left + 1) / width, height: (bottom - top + 1) / height };
}

export class NOXBiSeNetFaceParsingProvider {
  constructor({
    runtimeLoader = () => import(DEFAULTS.runtimeUrl),
    modelUrl = DEFAULTS.modelUrl,
    modelInputSize = DEFAULTS.modelInputSize,
    maxInputDimension = DEFAULTS.maxInputDimension,
    executionProviders = ["webgpu", "wasm"],
    sessionFactory = null,
    preprocessFrame = preprocessCanvasFrame,
    canvasFactory = defaultCanvasFactory
  } = {}) {
    this.runtimeLoader = runtimeLoader; this.modelUrl = modelUrl;
    this.modelInputSize = Math.max(1, Math.floor(Number(modelInputSize) || DEFAULTS.modelInputSize));
    this.maxInputDimension = Math.max(1, Math.floor(Number(maxInputDimension) || DEFAULTS.maxInputDimension));
    this.executionProviders = executionProviders; this.sessionFactory = sessionFactory;
    this.preprocessFrame = preprocessFrame; this.canvasFactory = canvasFactory;
    this.runtime = null; this.session = null; this.inputName = null; this.outputName = null;
    this.state = "idle"; this.sequence = 0;
  }

  async initialize() {
    if (this.session) return { available: true, state: "ready", provider: "BiSeNet-ResNet18-ONNX" };
    if (typeof this.modelUrl !== "string" || !this.modelUrl.trim()) {
      this.state = "unavailable";
      return { available: false, state: this.state, reason: "model-url-not-configured" };
    }
    this.state = "loading";
    try {
      if (this.sessionFactory) {
        const created = await this.sessionFactory(this.modelUrl, this.executionProviders);
        this.runtime = created.runtime || null; this.session = created.session || created;
      } else {
        this.runtime = await this.runtimeLoader();
        if (!this.runtime?.InferenceSession?.create || !this.runtime?.Tensor) throw new Error("onnx-runtime-api-unavailable");
        this.session = await this.runtime.InferenceSession.create(this.modelUrl, { executionProviders: this.executionProviders });
      }
      const inputs = this.session.inputNames || this.session.getInputs?.().map(item => item.name);
      const outputs = this.session.outputNames || this.session.getOutputs?.().map(item => item.name);
      this.inputName = inputs?.[0] || null; this.outputName = outputs?.[0] || null;
      if (!this.inputName || !this.outputName) throw new Error("onnx-model-io-metadata-unavailable");
      this.state = "ready";
      return { available: true, state: "ready", provider: "BiSeNet-ResNet18-ONNX", model: "yakhyo/face-parsing-resnet18", inputSize: this.modelInputSize, classes: DEFAULTS.classCount };
    } catch (error) {
      this.session = null; this.runtime = null; this.state = "unavailable";
      return { available: false, state: this.state, reason: "bisenet-model-load-failed", detail: String(error?.message || error).slice(0, 160) };
    }
  }

  async segment({ source, width, height, frameId, timestamp } = {}) {
    if (this.state !== "ready" || !this.session || (!this.runtime?.Tensor && !this.sessionFactory)) throw new Error("bisenet-provider-not-ready");
    if (!validFrame({ source, width, height, timestamp }, this.maxInputDimension)) throw new Error("invalid-or-oversized-frame");
    const requestSequence = ++this.sequence;
    const inputData = await this.preprocessFrame(source, width, height, this.modelInputSize, this.canvasFactory);
    if (!(inputData instanceof Float32Array) || inputData.length !== 3 * this.modelInputSize * this.modelInputSize) throw new Error("invalid-bisenet-input-tensor");
    const dims = [1, 3, this.modelInputSize, this.modelInputSize];
    const tensor = this.runtime?.Tensor ? new this.runtime.Tensor("float32", inputData, dims) : { data: inputData, dims };
    const outputs = await this.session.run({ [this.inputName]: tensor });
    if (requestSequence !== this.sequence) throw new Error("superseded-bisenet-frame");
    const output = outputs?.[this.outputName] || Object.values(outputs || {})[0];
    if (!output?.data || !Array.isArray(output.dims) || output.dims.length !== 4 ||
        output.dims[0] !== 1 || output.dims[1] !== DEFAULTS.classCount ||
        output.dims[2] !== this.modelInputSize || output.dims[3] !== this.modelInputSize) throw new Error("unexpected-bisenet-output-tensor");

    const decoded = decodeLogits(output.data, this.modelInputSize, this.modelInputSize, DEFAULTS.classCount);
    const letterbox = inputData.noxLetterbox || {
      x: 0, y: 0, width: this.modelInputSize, height: this.modelInputSize
    };
    const croppedLabels = cropLetterboxed(
      decoded.labels, this.modelInputSize, this.modelInputSize, letterbox
    );
    if (croppedLabels.width < 1 || croppedLabels.height < 1) {
      throw new Error("invalid-bisenet-letterbox-region");
    }
    const faceBox = faceBounds(croppedLabels.data, croppedLabels.width, croppedLabels.height);
    if (!faceBox) throw new Error("bisenet-face-skin-not-found");
    const croppedSemantic = new Map();
    for (const [classId, probabilities] of decoded.semanticProbabilities) {
      croppedSemantic.set(classId, cropLetterboxed(
        probabilities, this.modelInputSize, this.modelInputSize, letterbox
      ).data);
    }
    const skin = makeRegionMask(combineClassProbabilities(croppedSemantic, CLASS_IDS.skin, croppedLabels.data), croppedLabels.width, croppedLabels.height, width, height);
    const lips = makeRegionMask(combineClassProbabilities(croppedSemantic, CLASS_IDS.lips, croppedLabels.data), croppedLabels.width, croppedLabels.height, width, height);
    const brows = makeRegionMask(combineClassProbabilities(croppedSemantic, CLASS_IDS.brows, croppedLabels.data), croppedLabels.width, croppedLabels.height, width, height);
    if (!skin) throw new Error("bisenet-skin-mask-not-found");
    return {
      width, height, frameId, timestamp,
      source: "yakhyo-bisenet-resnet18-onnx-19class",
      faceBox: {
        x: faceBox.x, y: faceBox.y,
        width: Math.min(faceBox.width, 1 - faceBox.x),
        height: Math.min(faceBox.height, 1 - faceBox.y)
      },
      skin: { data: skin.data, confidence: skin.confidence, className: "skin" },
      regions: { ...(lips ? { lips } : {}), ...(brows ? { brows } : {}) },
      unavailableRegions: ["eyelids", "cheeks"]
    };
  }

  async dispose() {
    this.sequence += 1;
    const session = this.session; this.session = null; this.runtime = null;
    this.inputName = null; this.outputName = null; this.state = "idle";
    try { await session?.release?.(); } catch { /* safe cleanup */ }
  }
}

export const NOX_BISENET_FACE_PARSING_MODEL = Object.freeze({
  provider: "BiSeNet-ResNet18-ONNX",
  source: "https://github.com/yakhyo/face-parsing",
  repositoryLicense: "MIT",
  weightAndTrainingDataReview: "confirm upstream weight and CelebAMask-HQ data terms before commercial redistribution",
  modelUrl: DEFAULTS.modelUrl,
  sha256: "0d9bd318e46987c3bdbfacae9e2c0f461cae1c6ac6ea6d43bbe541a91727e33f",
  downloadBytes: 53205364,
  inputSize: DEFAULTS.modelInputSize,
  classCount: DEFAULTS.classCount,
  availableMakeupRegions: ["lips", "brows"],
  unavailableMakeupRegions: ["eyelids", "cheeks"],
  inference: "local-browser"
});
