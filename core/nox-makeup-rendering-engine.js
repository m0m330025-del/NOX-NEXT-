/**
 * NOX Makeup Rendering Engine v1
 *
 * Pixel compositor for trusted semantic region masks supplied by a real
 * segmentation provider. It never guesses facial geometry from coordinates.
 * Missing/invalid masks fail closed; pixels outside accepted masks are untouched.
 */

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const REGIONS = new Set(["lips", "eyelids", "cheeks", "brows"]);

export class NOXMakeupRenderingEngine {
  constructor({ minConfidence = 0.8, maxOpacity = 0.7 } = {}) {
    this.minConfidence = clamp01(Number(minConfidence));
    this.maxOpacity = clamp01(Number(maxOpacity));
    this.lastResult = null;
  }

  render(image, regionMasks, looks) {
    const width = Math.floor(Number(image?.width));
    const height = Math.floor(Number(image?.height));
    const pixels = image?.data;
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0 || !pixels ||
        pixels.length !== width * height * 4) {
      return this.reject("invalid-image");
    }
    if (!regionMasks || typeof regionMasks !== "object" ||
        !looks || typeof looks !== "object") {
      return this.reject("missing-region-masks-or-look");
    }

    const requested = Object.entries(looks);
    if (!requested.length) return this.reject("empty-look");

    const accepted = [];
    for (const [region, look] of requested) {
      if (!REGIONS.has(region)) return this.reject("unsupported-region");
      const mask = regionMasks[region];
      if (!mask || mask.width !== width || mask.height !== height ||
          !mask.data || mask.data.length !== width * height) {
        return this.reject("missing-or-mismatched-region-mask");
      }
      if (typeof mask.source !== "string" || !mask.source.trim()) {
        return this.reject("missing-mask-source");
      }
      const confidence = Number(mask.confidence);
      if (!Number.isFinite(confidence) || confidence < this.minConfidence || confidence > 1) {
        return this.reject("low-region-confidence");
      }
      const color = look?.color;
      const opacity = Number(look?.opacity);
      if (!Array.isArray(color) || color.length !== 3 ||
          !color.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255) ||
          !Number.isFinite(opacity) || opacity < 0 || opacity > this.maxOpacity) {
        return this.reject("invalid-makeup-look");
      }
      for (let i = 0; i < mask.data.length; i += 1) {
        const value = Number(mask.data[i]);
        if (!Number.isFinite(value) || value < 0 || value > 1) {
          return this.reject("invalid-region-mask-value");
        }
      }
      accepted.push({ region, mask, color, opacity, confidence });
    }

    const output = new Uint8ClampedArray(pixels);
    let changedPixels = 0;
    const changed = new Uint8Array(width * height);

    for (const { mask, color, opacity } of accepted) {
      for (let i = 0; i < mask.data.length; i += 1) {
        const alpha = clamp01(Number(mask.data[i])) * opacity;
        if (alpha <= 0) continue;
        const p = i * 4;
        output[p] = output[p] * (1 - alpha) + color[0] * alpha;
        output[p + 1] = output[p + 1] * (1 - alpha) + color[1] * alpha;
        output[p + 2] = output[p + 2] * (1 - alpha) + color[2] * alpha;
        changed[i] = 1;
      }
    }
    for (const flag of changed) changedPixels += flag;

    const result = {
      state: "rendered",
      image: { width, height, data: output },
      regions: accepted.map(({ region, confidence }) => ({ region, confidence })),
      changedPixels,
      source: "provider-semantic-masks"
    };
    this.lastResult = result;
    return result;
  }

  reject(reason) {
    this.lastResult = { state: "rejected", reason, image: null };
    return this.lastResult;
  }

  reset() {
    this.lastResult = null;
  }
}
