/**
 * NOX Temporal Alignment Engine.
 * Converts sparse, confidence-gated optical-flow samples into bounded per-slot
 * translations. It does not estimate rotation, scale, depth, or dense warps.
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export class NOXTemporalAlignmentEngine {
  constructor({
    minConfidence = 0.16,
    minVectorCount = 4,
    maxStep = 0.035,
    maxAccumulated = 0.12,
    maxDispersion = 0.018
  } = {}) {
    this.options = { minConfidence, minVectorCount, maxStep, maxAccumulated, maxDispersion };
    this.reset();
  }

  configure(slotCount) {
    if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 8) {
      throw new RangeError("invalid-temporal-alignment-slot-count");
    }
    if (this.slots.length !== slotCount) {
      this.slots = Array.from({ length: slotCount }, () => this.createSlot());
      this.lastSequence = -1;
    }
    return this.getStatus();
  }

  createSlot() {
    return { dx: 0, dy: 0, confidence: 0, valid: false, updates: 0 };
  }

  ingest(vectors, { sequence, width, height } = {}) {
    if (!Array.isArray(vectors) || !Number.isInteger(sequence) ||
        !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return { accepted: false, reason: "invalid-flow-sample", vectorCount: 0 };
    }
    if (sequence <= this.lastSequence) {
      return { accepted: false, reason: "stale-flow-sample", vectorCount: 0 };
    }
    this.lastSequence = sequence;
    const usable = vectors.filter(vector =>
      vector && Number.isFinite(vector.dx) && Number.isFinite(vector.dy) &&
      Number.isFinite(vector.confidence) && vector.confidence >= this.options.minConfidence &&
      Math.abs(vector.dx) <= 0.25 && Math.abs(vector.dy) <= 0.25
    );
    if (usable.length < this.options.minVectorCount) {
      return { accepted: false, reason: "insufficient-confident-vectors", vectorCount: usable.length };
    }
    const dx = median(usable.map(vector => vector.dx));
    const dy = median(usable.map(vector => vector.dy));
    const dispersion = median(usable.map(vector => Math.hypot(vector.dx - dx, vector.dy - dy)));
    const confidence = usable.reduce((sum, vector) => sum + vector.confidence, 0) / usable.length;
    if (dispersion > this.options.maxDispersion) {
      return { accepted: false, reason: "inconsistent-motion-vectors", vectorCount: usable.length, dispersion };
    }
    const stepX = Math.max(-this.options.maxStep, Math.min(this.options.maxStep, dx));
    const stepY = Math.max(-this.options.maxStep, Math.min(this.options.maxStep, dy));
    for (const slot of this.slots) {
      if (!slot.valid) continue;
      const nextX = slot.dx + stepX;
      const nextY = slot.dy + stepY;
      if (Math.abs(nextX) > this.options.maxAccumulated || Math.abs(nextY) > this.options.maxAccumulated) {
        slot.valid = false;
        slot.confidence = 0;
        continue;
      }
      slot.dx = nextX;
      slot.dy = nextY;
      slot.confidence = Math.min(slot.updates ? slot.confidence : confidence, confidence);
      slot.updates += 1;
    }
    this.lastAccepted = { dx: stepX, dy: stepY, confidence, dispersion, vectorCount: usable.length, sequence };
    return { accepted: true, ...this.lastAccepted };
  }

  onCapture(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.slots.length) {
      throw new RangeError("invalid-temporal-alignment-slot");
    }
    this.slots[index] = { dx: 0, dy: 0, confidence: 1, valid: true, updates: 0 };
    return this.getTransform(index);
  }

  getTransform(index) {
    const slot = this.slots[index];
    if (!slot) return { valid: false, dx: 0, dy: 0, confidence: 0 };
    return { valid: slot.valid, dx: slot.dx, dy: slot.dy, confidence: slot.confidence, updates: slot.updates };
  }

  getStatus() {
    return {
      slotCount: this.slots.length,
      lastSequence: this.lastSequence,
      lastAccepted: this.lastAccepted ? { ...this.lastAccepted } : null,
      validSlots: this.slots.filter(slot => slot.valid).length
    };
  }

  reset() {
    this.slots = [];
    this.lastSequence = -1;
    this.lastAccepted = null;
  }
}
