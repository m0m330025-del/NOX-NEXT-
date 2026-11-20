/**
 * NOX Live Makeup Compositor.
 * Builds a transparent semantic-color layer and composites it over each fresh
 * camera render. It never reuses the previous rendered camera frame.
 */
const SUPPORTED_REGIONS = new Set(["lips", "brows"]);

export class NOXLiveMakeupCompositor {
  constructor({ canvasFactory = () => document.createElement("canvas"), maxAgeMs = 220 } = {}) {
    if (typeof canvasFactory !== "function" || !Number.isFinite(maxAgeMs) || maxAgeMs < 1) {
      throw new TypeError("invalid-live-makeup-compositor-options");
    }
    this.canvasFactory = canvasFactory;
    this.maxAgeMs = maxAgeMs;
    this.canvas = null;
    this.sequence = 0;
    this.capturedAt = 0;
    this.width = 0;
    this.height = 0;
  }

  accept({ sequence, capturedAt, vision, look } = {}) {
    if (!Number.isInteger(sequence) || sequence <= this.sequence ||
        !Number.isFinite(capturedAt) || !vision?.frame ||
        !Number.isInteger(vision.frame.width) || !Number.isInteger(vision.frame.height) ||
        vision.frame.width < 1 || vision.frame.height < 1 ||
        !look || typeof look !== "object") return false;

    const width = vision.frame.width, height = vision.frame.height;
    const canvas = this.canvasFactory();
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const image = context.createImageData(width, height);
    let changed = 0;

    for (const [region, style] of Object.entries(look)) {
      if (!SUPPORTED_REGIONS.has(region)) return false;
      const mask = vision.regionMasks?.[region];
      const color = style?.color, opacity = Number(style?.opacity);
      if (!mask || mask.width !== width || mask.height !== height ||
          !mask.data || mask.data.length !== width * height ||
          !Number.isFinite(mask.confidence) || mask.confidence < 0.8 || mask.confidence > 1 ||
          !Array.isArray(color) || color.length !== 3 ||
          !color.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255) ||
          !Number.isFinite(opacity) || opacity < 0 || opacity > 0.58) return false;

      for (let i = 0; i < mask.data.length; i += 1) {
        const probability = Number(mask.data[i]);
        if (!Number.isFinite(probability) || probability < 0 || probability > 1) return false;
        const alpha = Math.round(probability * opacity * 255);
        if (!alpha) continue;
        const offset = i * 4;
        image.data[offset] = color[0];
        image.data[offset + 1] = color[1];
        image.data[offset + 2] = color[2];
        image.data[offset + 3] = alpha;
        changed += 1;
      }
    }
    if (!changed) return false;
    context.putImageData(image, 0, 0);
    this.canvas = canvas;
    this.sequence = sequence;
    this.capturedAt = capturedAt;
    this.width = width;
    this.height = height;
    return true;
  }

  draw(targetCanvas, { now, mirrored = false } = {}) {
    if (!this.canvas || !targetCanvas || !Number.isFinite(now) ||
        now < this.capturedAt || now - this.capturedAt > this.maxAgeMs) {
      this.clear();
      return false;
    }
    const context = targetCanvas.getContext("2d");
    if (!context) return false;
    context.save();
    if (mirrored) {
      context.translate(targetCanvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(this.canvas, 0, 0, targetCanvas.width, targetCanvas.height);
    context.restore();
    return true;
  }

  clear() {
    this.canvas = null;
    this.capturedAt = 0;
    this.width = 0;
    this.height = 0;
  }
}
