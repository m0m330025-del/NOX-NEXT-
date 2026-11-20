/**
 * NOX Skin Segmentation Engine v1
 *
 * Validation and gating layer for a future real skin-segmentation provider.
 * It does not create a mask from RGB pixels, face boxes, or landmarks.
 * Only externally supplied per-pixel probabilities are accepted.
 */

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export class NOXSkinSegmentationEngine {
  constructor({
    minConfidence = 0.75,
    minCoverage = 0.04,
    maxCoverage = 0.82,
    minPixels = 16
  } = {}) {
    this.minConfidence = clamp01(Number(minConfidence));
    this.minCoverage = clamp01(Number(minCoverage));
    this.maxCoverage = clamp01(Number(maxCoverage));
    this.minPixels = Math.max(1, Math.floor(Number(minPixels) || 1));
    this.lastResult = null;
  }

  validateMask({ data, width, height, confidence, source, faceBox } = {}) {
    const w = Math.floor(Number(width));
    const h = Math.floor(Number(height));
    const score = Number(confidence);

    if (!data || !Number.isInteger(w) || !Number.isInteger(h) ||
        w <= 0 || h <= 0 || data.length !== w * h) {
      return this.reject("invalid-mask");
    }
    if (typeof source !== "string" || !source.trim()) {
      return this.reject("missing-mask-source");
    }
    if (!Number.isFinite(score) || score < this.minConfidence || score > 1) {
      return this.reject("low-confidence");
    }
    if (!faceBox || ![faceBox.x, faceBox.y, faceBox.width, faceBox.height].every(Number.isFinite) ||
        faceBox.width <= 0 || faceBox.height <= 0) {
      return this.reject("missing-face-region");
    }

    let count = 0;
    let left = w;
    let top = h;
    let right = -1;
    let bottom = -1;
    const mask = new Uint8Array(w * h);

    for (let i = 0; i < data.length; i += 1) {
      const value = Number(data[i]);
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        return this.reject("invalid-mask-value");
      }
      if (value < 0.5) continue;
      const x = i % w;
      const y = Math.floor(i / w);
      const nx = (x + 0.5) / w;
      const ny = (y + 0.5) / h;
      const insideFace = nx >= faceBox.x && nx <= faceBox.x + faceBox.width &&
        ny >= faceBox.y && ny <= faceBox.y + faceBox.height;
      if (!insideFace) continue;
      mask[i] = 1;
      count += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }

    const faceArea = Math.max(1, faceBox.width * faceBox.height * w * h);
    const coverage = count / faceArea;
    if (count < this.minPixels) return this.reject("insufficient-skin-pixels");
    if (coverage < this.minCoverage || coverage > this.maxCoverage) {
      return this.reject("implausible-mask-coverage");
    }

    const result = {
      state: "accepted",
      source: source.trim(),
      confidence: score,
      width: w,
      height: h,
      coverage,
      pixelCount: count,
      bounds: {
        x: left / w,
        y: top / h,
        width: (right - left + 1) / w,
        height: (bottom - top + 1) / h
      },
      mask
    };
    this.lastResult = result;
    return result;
  }

  reject(reason) {
    this.lastResult = { state: "rejected", reason, mask: null };
    return this.lastResult;
  }

  reset() {
    this.lastResult = null;
  }
}
