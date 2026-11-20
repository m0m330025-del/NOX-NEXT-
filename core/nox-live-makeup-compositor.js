/**
 * NOX Live Makeup Compositor.
 * Builds a transparent semantic-color layer and composites it over each fresh
 * camera render. It never reuses the previous rendered camera frame.
 */
const SUPPORTED_REGIONS = new Set(["lips", "brows"]);

export class NOXLiveMakeupCompositor {
  constructor({ canvasFactory = () => document.createElement("canvas"), maxAgeMs = 220, edgeSoftness = 0.35, maxCenterDrift = 0.12, minScaleRatio = 0.75, maxScaleRatio = 1.33 } = {}) {
    if (typeof canvasFactory !== "function" || !Number.isFinite(maxAgeMs) || maxAgeMs < 1 ||
        !Number.isFinite(edgeSoftness) || edgeSoftness < 0 || edgeSoftness > 0.8 ||\n        !Number.isFinite(maxCenterDrift) || maxCenterDrift <= 0 || maxCenterDrift > 0.25 ||\n        !Number.isFinite(minScaleRatio) || minScaleRatio <= 0 || minScaleRatio >= 1 ||\n        !Number.isFinite(maxScaleRatio) || maxScaleRatio <= 1 || maxScaleRatio > 2) {
      throw new TypeError("invalid-live-makeup-compositor-options");
    }
    this.canvasFactory = canvasFactory;
    this.maxAgeMs = maxAgeMs;
    this.edgeSoftness = edgeSoftness;\n    this.maxCenterDrift = maxCenterDrift;\n    this.minScaleRatio = minScaleRatio;\n    this.maxScaleRatio = maxScaleRatio;
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
        if (!probability) continue;
        // Feather only pixels already inside the semantic mask. Neighbor
        // occupancy softens the contour without expanding color into the background.
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
        const alpha = Math.round(probability * opacity * boundaryFactor * 255);
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
    this.faceBox = vision.faceBox && [vision.faceBox.x, vision.faceBox.y, vision.faceBox.width, vision.faceBox.height].every(Number.isFinite)
      ? { ...vision.faceBox } : null;
    return true;
  }

  draw(targetCanvas, { now, mirrored = false, currentFaceBox = null } = {}) {
    if (!this.canvas || !targetCanvas || !Number.isFinite(now) ||
        now < this.capturedAt || now - this.capturedAt > this.maxAgeMs) {
      this.clear();
      return false;
    }
    let alignment = null;
    if (this.faceBox) {
      const validCurrent = currentFaceBox &&
        [currentFaceBox.x, currentFaceBox.y, currentFaceBox.width, currentFaceBox.height].every(Number.isFinite) &&
        currentFaceBox.width > 0 && currentFaceBox.height > 0;
      const validPrevious = [this.faceBox.x, this.faceBox.y, this.faceBox.width, this.faceBox.height].every(Number.isFinite) &&
        this.faceBox.width > 0 && this.faceBox.height > 0;
      if (!validCurrent || !validPrevious) {
        this.clear();
        return false;
      }
      const previousCenterX = this.faceBox.x + this.faceBox.width / 2;
      const previousCenterY = this.faceBox.y + this.faceBox.height / 2;
      const currentCenterX = currentFaceBox.x + currentFaceBox.width / 2;
      const currentCenterY = currentFaceBox.y + currentFaceBox.height / 2;
      const centerDrift = Math.hypot(currentCenterX - previousCenterX, currentCenterY - previousCenterY);
      const scaleX = currentFaceBox.width / this.faceBox.width;
      const scaleY = currentFaceBox.height / this.faceBox.height;
      const aspectRatio = (currentFaceBox.width / currentFaceBox.height) /
        (this.faceBox.width / this.faceBox.height);
      if (centerDrift > this.maxCenterDrift ||
          scaleX < this.minScaleRatio || scaleX > this.maxScaleRatio ||
          scaleY < this.minScaleRatio || scaleY > this.maxScaleRatio ||
          aspectRatio < this.minScaleRatio || aspectRatio > this.maxScaleRatio) {
        this.clear();
        return false;
      }
      alignment = { previousCenterX, previousCenterY, currentCenterX, currentCenterY, scaleX, scaleY };
    }
    const context = targetCanvas.getContext("2d");
    if (!context) return false;
    context.save();
    if (alignment) {
      context.translate(alignment.currentCenterX * targetCanvas.width, alignment.currentCenterY * targetCanvas.height);
      context.scale(alignment.scaleX, alignment.scaleY);
      context.translate(-alignment.previousCenterX * targetCanvas.width, -alignment.previousCenterY * targetCanvas.height);
    }
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
    this.faceBox = null;
  }
}
