/**
 * NOX Beauty Vision Provider Adapter v1
 *
 * Contract adapter for an injected, real semantic segmentation provider.
 * This module does NOT detect faces or generate masks itself.
 * It validates provider output, frame freshness, dimensions and confidence,
 * then exposes compatible skin and facial-region masks to downstream engines.
 */

const REGIONS = new Set(["lips", "eyelids", "cheeks", "brows"]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validFaceBox(box) {
  if (!box || ![box.x, box.y, box.width, box.height].every(isFiniteNumber)) return false;
  return box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
    box.x + box.width <= 1 && box.y + box.height <= 1;
}

function copyProbabilityMask(data, expectedLength) {
  if (!data || data.length !== expectedLength) return null;
  const copy = new Float32Array(expectedLength);
  for (let i = 0; i < expectedLength; i += 1) {
    const value = Number(data[i]);
    if (!Number.isFinite(value) || value < 0 || value > 1) return null;
    copy[i] = value;
  }
  return copy;
}

export class NOXBeautyVisionProvider {
  constructor({
    provider = null,
    minSkinConfidence = 0.75,
    minRegionConfidence = 0.8,
    maxFrameAgeMs = 250,
    maxFutureSkewMs = 50,
    now = () => Date.now()
  } = {}) {
    this.provider = provider;
    this.minSkinConfidence = minSkinConfidence;
    this.minRegionConfidence = minRegionConfidence;
    this.maxFrameAgeMs = maxFrameAgeMs;
    this.maxFutureSkewMs = maxFutureSkewMs;
    this.now = now;
    this.state = "idle";
    this.sequence = 0;
    this.lifecycleGeneration = 0;
    this.lastResult = null;
  }

  setProvider(provider) {
    this.lifecycleGeneration += 1;
    this.sequence += 1;
    this.provider = provider;
    this.state = "idle";
    this.lastResult = null;
  }

  async initialize() {
    const generation = this.lifecycleGeneration;
    const provider = this.provider;
    if (!provider || typeof provider.segment !== "function") {
      this.state = "unavailable";
      return { state: this.state, available: false, reason: "provider-not-configured" };
    }
    try {
      if (typeof provider.initialize === "function") {
        const result = await provider.initialize();
        if (generation !== this.lifecycleGeneration || provider !== this.provider) {
          return { state: "idle", available: false, reason: "initialization-superseded" };
        }
        if (result?.available === false) {
          this.state = "unavailable";
          return { state: this.state, available: false, reason: "provider-unavailable" };
        }
      }
      if (generation !== this.lifecycleGeneration || provider !== this.provider) {
        return { state: "idle", available: false, reason: "initialization-superseded" };
      }
      this.state = "ready";
      return { state: this.state, available: true };
    } catch {
      if (generation !== this.lifecycleGeneration || provider !== this.provider) {
        return { state: "idle", available: false, reason: "initialization-superseded" };
      }
      this.state = "error";
      return { state: this.state, available: false, reason: "provider-initialize-failed" };
    }
  }

  async processFrame(frame) {
    if (this.state !== "ready" || !this.provider) {
      return this.reject("provider-not-ready");
    }
    const width = Math.floor(Number(frame?.width));
    const height = Math.floor(Number(frame?.height));
    const timestamp = frame?.timestamp;
    if (!frame?.source || !Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0 || !isFiniteNumber(timestamp)) {
      return this.reject("invalid-frame");
    }

    const age = this.now() - timestamp;
    if (age > this.maxFrameAgeMs || age < -this.maxFutureSkewMs) {
      return this.reject("stale-or-future-frame");
    }

    const requestSequence = ++this.sequence;
    const provider = this.provider;
    let output;
    try {
      output = await provider.segment({
        source: frame.source,
        width,
        height,
        frameId: frame.frameId ?? requestSequence,
        timestamp
      });
    } catch {
      return this.reject("provider-segmentation-failed");
    }

    if (requestSequence !== this.sequence || provider !== this.provider) {
      return this.reject("superseded-frame");
    }
    if (!output || output.width !== width || output.height !== height ||
        output.frameId !== (frame.frameId ?? requestSequence) ||
        output.timestamp !== timestamp) {
      return this.reject("provider-frame-mismatch");
    }
    if (typeof output.source !== "string" || !output.source.trim() ||
        !validFaceBox(output.faceBox)) {
      return this.reject("invalid-provider-metadata");
    }

    const length = width * height;
    const skinConfidence = Number(output.skin?.confidence);
    const skinData = copyProbabilityMask(output.skin?.data, length);
    const skinMask = skinData && Number.isFinite(skinConfidence) &&
      skinConfidence >= this.minSkinConfidence && skinConfidence <= 1
      ? {
          width, height, data: skinData, confidence: skinConfidence,
          source: output.source.trim()
        }
      : null;

    const regionMasks = {};
    const unavailable = [];
    const providedRegions = output.regions && typeof output.regions === "object"
      ? output.regions : {};

    for (const region of REGIONS) {
      const candidate = providedRegions[region];
      if (!candidate) {
        unavailable.push(region);
        continue;
      }
      const confidence = Number(candidate.confidence);
      const data = copyProbabilityMask(candidate.data, length);
      if (!data || !Number.isFinite(confidence) ||
          confidence < this.minRegionConfidence || confidence > 1) {
        unavailable.push(region);
        continue;
      }
      regionMasks[region] = {
        width, height, data, confidence, source: output.source.trim()
      };
    }

    if (!skinMask && Object.keys(regionMasks).length === 0) {
      return this.reject("no-trusted-masks");
    }

    const result = {
      state: unavailable.length === 0 && skinMask ? "complete" : "partial",
      source: output.source.trim(),
      frame: { width, height, frameId: output.frameId, timestamp },
      faceBox: { ...output.faceBox },
      skinMask,
      regionMasks,
      fusion: output.fusion && typeof output.fusion === "object" ? {
        state: output.fusion.state === "fused" ? "fused" : "partial",
        landmarkStatus: typeof output.fusion.landmarkStatus === "string"
          ? output.fusion.landmarkStatus : "unavailable",
        alignmentIoU: isFiniteNumber(output.fusion.alignmentIoU) &&
          output.fusion.alignmentIoU >= 0 && output.fusion.alignmentIoU <= 1
          ? output.fusion.alignmentIoU : null
      } : { state: "segmentation-only", landmarkStatus: "not-provided", alignmentIoU: null },
      landmarks: output.landmarks && output.landmarks.source === "mediapipe-face-landmarker-478" &&
        output.landmarks.width === width && output.landmarks.height === height &&
        Array.isArray(output.landmarks.regions)
        ? output.landmarks : (
          output.landmarks && output.landmarks.source === "mediapipe-face-landmarker-478" &&
          output.landmarks.width === width && output.landmarks.height === height
            ? output.landmarks : null
        ),
      unavailable: [
        ...(!skinMask ? ["skin"] : []),
        ...unavailable
      ]
    };
    this.lastResult = result;
    return result;
  }

  reject(reason) {
    this.lastResult = { state: "rejected", reason, skinMask: null, regionMasks: {} };
    return this.lastResult;
  }

  async reset() {
    this.lifecycleGeneration += 1;
    this.sequence += 1;
    const provider = this.provider;
    this.state = "idle";
    this.lastResult = null;
    if (typeof provider?.dispose === "function") {
      try { await provider.dispose(); } catch { /* cleanup must remain safe */ }
    }
  }
}
