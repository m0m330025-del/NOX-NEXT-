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
  constructor({ minConfidence = 0.8, maxOpacity = 0.7, edgeSoftness = 0.35 } = {}) {
    if (!Number.isFinite(edgeSoftness) || edgeSoftness < 0 || edgeSoftness > 0.8) {
      throw new TypeError("invalid-makeup-edge-softness");
    }
    this.minConfidence = clamp01(Number(minConfidence));
    this.maxOpacity = clamp01(Number(maxOpacity));
    this.edgeSoftness = edgeSoftness;
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
    const overlay = new Uint8ClampedArray(width * height * 4);
    let changedPixels = 0;
    const changed = new Uint8Array(width * height);

    for (const { mask, color, opacity } of accepted) {
      for (let i = 0; i < mask.data.length; i += 1) {
        const probability = clamp01(Number(mask.data[i]));
        if (!probability) continue;
        const x = i % width, y = Math.floor(i / width);
        let neighbors = 0, neighborSlots = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (!ox && !oy) continue;
            const nx = x + ox, ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            neighborSlots += 1;
            if (Number(mask.data[ny * width + nx]) > 0) neighbors += 1;
          }
        }
        const neighborRatio = neighborSlots ? neighbors / neighborSlots : 1;
        const boundaryFactor = 1 - this.edgeSoftness * (1 - neighborRatio);
        const alpha = probability * opacity * boundaryFactor;
        if (alpha <= 0) continue;
        const p = i * 4;
        output[p] = output[p] * (1 - alpha) + color[0] * alpha;
        output[p + 1] = output[p + 1] * (1 - alpha) + color[1] * alpha;
        output[p + 2] = output[p + 2] * (1 - alpha) + color[2] * alpha;

        // Build one transparent source-over layer from the same rendered makeup.
        // This lets the camera compositor place the engine's actual result without
        // recalculating colors or mask opacity in a second rendering path.
        const previousAlpha = overlay[p + 3] / 255;
        const combinedAlpha = alpha + previousAlpha * (1 - alpha);
        if (combinedAlpha > 0) {
          overlay[p] = (color[0] * alpha + overlay[p] * previousAlpha * (1 - alpha)) / combinedAlpha;
          overlay[p + 1] = (color[1] * alpha + overlay[p + 1] * previousAlpha * (1 - alpha)) / combinedAlpha;
          overlay[p + 2] = (color[2] * alpha + overlay[p + 2] * previousAlpha * (1 - alpha)) / combinedAlpha;
          overlay[p + 3] = combinedAlpha * 255;
        }
        changed[i] = 1;
      }
    }
    for (const flag of changed) changedPixels += flag;

    const result = {
      state: "rendered",
      image: { width, height, data: output },
      overlay: { width, height, data: overlay },
      frame: image.frame && typeof image.frame === "object" ? { ...image.frame } : null,
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
