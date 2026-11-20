import { calculateNOXFaceRollDelta } from "./nox-face-roll-delta.js";
/**
 * NOX Live Makeup Compositor.
 * Builds a transparent semantic-color layer and composites it over each fresh
 * camera render. It never reuses the previous rendered camera frame. Roll
 * compensation is applied only when both captured and current estimates are fresh.
 */
const SUPPORTED_REGIONS = new Set(["lips", "brows"]);

export class NOXLiveMakeupCompositor {
  constructor({ canvasFactory = () => document.createElement("canvas"), maxAgeMs = 220, maxRollAgeMs = 80, maxRollDeltaRadians = 0.35, edgeSoftness = 0.35, maxCenterDrift = 0.12, minScaleRatio = 0.75, maxScaleRatio = 1.33 } = {}) {
    if (typeof canvasFactory !== "function" || !Number.isFinite(maxAgeMs) || maxAgeMs < 1 ||
        !Number.isFinite(maxRollAgeMs) || maxRollAgeMs < 1 ||
        !Number.isFinite(maxRollDeltaRadians) || maxRollDeltaRadians <= 0 || maxRollDeltaRadians > Math.PI / 2 ||
        !Number.isFinite(edgeSoftness) || edgeSoftness < 0 || edgeSoftness > 0.8 ||
        !Number.isFinite(maxCenterDrift) || maxCenterDrift <= 0 || maxCenterDrift > 0.25 ||
        !Number.isFinite(minScaleRatio) || minScaleRatio <= 0 || minScaleRatio >= 1 ||
        !Number.isFinite(maxScaleRatio) || maxScaleRatio <= 1 || maxScaleRatio > 2) {
      throw new TypeError("invalid-live-makeup-compositor-options");
    }
    this.canvasFactory = canvasFactory;
    this.maxAgeMs = maxAgeMs;
    this.maxRollAgeMs = maxRollAgeMs;
    this.maxRollDeltaRadians = maxRollDeltaRadians;
    this.edgeSoftness = edgeSoftness;
    this.maxCenterDrift = maxCenterDrift;
    this.minScaleRatio = minScaleRatio;
    this.maxScaleRatio = maxScaleRatio;
    this.canvas = null;
    this.sequence = 0;
    this.capturedAt = 0;
    this.width = 0;
    this.height = 0;
  }

  accept({ sequence, capturedAt, vision, look, makeup = null, capturedRoll = null } = {}) {
    if (!Number.isInteger(sequence) || sequence <= this.sequence ||
        !Number.isFinite(capturedAt) || !vision?.frame ||
        !Number.isInteger(vision.frame.width) || !Number.isInteger(vision.frame.height) ||
        vision.frame.width < 1 || vision.frame.height < 1 ||
        !(typeof vision.frame.id === "string" && vision.frame.id.length > 0) ||
        !Number.isFinite(vision.frame.timestamp) ||
        vision.frame.coordinateSpace !== "source-unmirrored-normalized" ||
        !vision.faceBox ||
        ![vision.faceBox.x, vision.faceBox.y, vision.faceBox.width, vision.faceBox.height].every(Number.isFinite) ||
        vision.faceBox.x < 0 || vision.faceBox.y < 0 ||
        vision.faceBox.width <= 0 || vision.faceBox.height <= 0 ||
        vision.faceBox.x + vision.faceBox.width > 1 ||
        vision.faceBox.y + vision.faceBox.height > 1 ||
        (makeup === null && (!look || typeof look !== "object"))) return false;

    const width = vision.frame.width, height = vision.frame.height;
    const canvas = this.canvasFactory();
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const image = context.createImageData(width, height);
    let changed = 0;

    if (makeup !== null) {
      const frame = makeup?.frame;
      const matchesFrame = frame &&
        frame.id === vision.frame.id &&
        frame.timestamp === vision.frame.timestamp &&
        (frame.capturedAtMonotonicMs ?? null) === (vision.frame.capturedAtMonotonicMs ?? null) &&
        frame.width === width && frame.height === height &&
        frame.coordinateSpace === vision.frame.coordinateSpace;
      const validPixels = value => value && ArrayBuffer.isView(value.data) &&
        value.data.length === width * height * 4;
      if (makeup?.state !== "rendered" || !matchesFrame ||
          !validPixels(makeup.image) || !validPixels(makeup.overlay) ||
          !Number.isInteger(makeup.changedPixels) || makeup.changedPixels <= 0 ||
          !Array.isArray(makeup.regions) || !makeup.regions.length) return false;
      image.data.set(makeup.overlay.data);
      changed = makeup.changedPixels;
    } else {
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
    }
    if (!changed) return false;
    context.putImageData(image, 0, 0);
    this.canvas = canvas;
    this.sequence = sequence;
    this.capturedAt = capturedAt;
    this.width = width;
    this.height = height;
    this.faceBox = { ...vision.faceBox };
    this.capturedRoll = capturedRoll?.state === "estimated" &&
      capturedRoll.frame?.id === vision.frame.id &&
      capturedRoll.frame?.timestamp === vision.frame.timestamp &&
      capturedRoll.frame?.capturedAtMonotonicMs === vision.frame.capturedAtMonotonicMs &&
      capturedRoll.frame?.width === width && capturedRoll.frame?.height === height &&
      capturedRoll.frame?.coordinateSpace === vision.frame.coordinateSpace
      ? capturedRoll : null;
    this.frame = {
      id: vision.frame.id,
      timestamp: vision.frame.timestamp,
      capturedAtMonotonicMs: vision.frame.capturedAtMonotonicMs ?? null,
      width,
      height,
      coordinateSpace: vision.frame.coordinateSpace
    };
    return true;
  }

  draw(targetCanvas, { now, nowMonotonicMs = now, mirrored = false, currentFaceBox = null, currentRoll = null } = {}) {
    if (!this.canvas || !targetCanvas || !Number.isFinite(now) ||
        now < this.capturedAt || now - this.capturedAt > this.maxAgeMs) {
      this.clear();
      return false;
    }
    if (!this.faceBox) {
      this.clear();
      return false;
    }
    let alignment = null;
    if (this.faceBox) {
      // FaceDetector is an optional experimental browser API. If it is unavailable,
      // the validated semantic faceBox from the exact makeup source frame remains
      // a safe short-lived anchor; the overlay's existing maxAgeMs gate still applies.
      const alignmentFaceBox = currentFaceBox === null ? this.faceBox : currentFaceBox;
      const validCurrent = alignmentFaceBox &&
        [alignmentFaceBox.x, alignmentFaceBox.y, alignmentFaceBox.width, alignmentFaceBox.height].every(Number.isFinite) &&
        alignmentFaceBox.width > 0 && alignmentFaceBox.height > 0;
      const validPrevious = [this.faceBox.x, this.faceBox.y, this.faceBox.width, this.faceBox.height].every(Number.isFinite) &&
        this.faceBox.width > 0 && this.faceBox.height > 0;
      if (!validCurrent || !validPrevious) {
        this.clear();
        return false;
      }
      const previousCenterX = this.faceBox.x + this.faceBox.width / 2;
      const previousCenterY = this.faceBox.y + this.faceBox.height / 2;
      const currentCenterX = alignmentFaceBox.x + alignmentFaceBox.width / 2;
      const currentCenterY = alignmentFaceBox.y + alignmentFaceBox.height / 2;
      const centerDrift = Math.hypot(currentCenterX - previousCenterX, currentCenterY - previousCenterY);
      const scaleX = alignmentFaceBox.width / this.faceBox.width;
      const scaleY = alignmentFaceBox.height / this.faceBox.height;
      const aspectRatio = (alignmentFaceBox.width / alignmentFaceBox.height) /
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
    const rollDelta = this.capturedRoll && currentRoll
      ? calculateNOXFaceRollDelta({
          capturedRoll: this.capturedRoll,
          currentRoll,
          nowMonotonicMs,
          maxAgeMs: this.maxRollAgeMs,
          maxDeltaRadians: this.maxRollDeltaRadians
        })
      : null;
    const context = targetCanvas.getContext("2d");
    if (!context) return false;
    context.save();
    // Canvas composes M * A * R: rotate in unmirrored source coordinates
    // around the captured face center, align to the current face, then mirror once.
    if (mirrored) {
      context.translate(targetCanvas.width, 0);
      context.scale(-1, 1);
    }
    if (alignment) {
      context.translate(alignment.currentCenterX * targetCanvas.width, alignment.currentCenterY * targetCanvas.height);
      context.scale(alignment.scaleX, alignment.scaleY);
      context.translate(-alignment.previousCenterX * targetCanvas.width, -alignment.previousCenterY * targetCanvas.height);
      if (rollDelta?.state === "accepted") {
        const centerX = alignment.previousCenterX * targetCanvas.width;
        const centerY = alignment.previousCenterY * targetCanvas.height;
        context.translate(centerX, centerY);
        context.rotate(rollDelta.deltaRadians);
        context.translate(-centerX, -centerY);
      }
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
    this.frame = null;
    this.capturedRoll = null;
  }
}
