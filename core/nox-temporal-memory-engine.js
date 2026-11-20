/**
 * NOX Temporal Memory Engine
 * Owns bounded temporal-buffer policy only. Canvas allocation, capture, and compositing
 * remain in the camera adapter so this module is deterministic and browser-independent.
 */
export class NOXTemporalMemoryEngine {
  constructor({
    liteMaxSide = 160, standardMaxSide = 224,
    liteBufferCount = 3, standardBufferCount = 4,
    liteIntervalMs = 180, standardIntervalMs = 120
  } = {}) {
    this.profileOptions = { liteMaxSide, standardMaxSide, liteBufferCount, standardBufferCount, liteIntervalMs, standardIntervalMs };
    this.reset();
  }

  configure(width, height, { lowPower = false } = {}) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new RangeError("invalid-temporal-frame-size");
    }
    const o = this.profileOptions;
    const maxSide = lowPower ? o.liteMaxSide : o.standardMaxSide;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const next = {
      sampleWidth: Math.max(1, Math.round(width * scale)),
      sampleHeight: Math.max(1, Math.round(height * scale)),
      bufferCount: lowPower ? o.liteBufferCount : o.standardBufferCount,
      intervalMs: lowPower ? o.liteIntervalMs : o.standardIntervalMs,
      lowPower: Boolean(lowPower)
    };
    const changed = !this.profile ||
      this.profile.sampleWidth !== next.sampleWidth ||
      this.profile.sampleHeight !== next.sampleHeight ||
      this.profile.bufferCount !== next.bufferCount ||
      this.profile.intervalMs !== next.intervalMs;
    if (changed) {
      this.reset();
      this.profile = next;
    }
    return { ...this.profile };
  }

  getCaptureDecision(now) {
    if (!Number.isFinite(now)) throw new TypeError("invalid-temporal-timestamp");
    if (!this.profile) return { capture: false, index: -1, reason: "not-configured" };
    const due = this.lastCaptureAt === null || now < this.lastCaptureAt ||
      now - this.lastCaptureAt >= this.profile.intervalMs;
    return { capture: due, index: due ? this.writeIndex : -1, reason: due ? "interval-due" : "interval-not-due" };
  }

  commitCapture(now) {
    if (!this.profile) throw new Error("temporal-engine-not-configured");
    if (!Number.isFinite(now)) throw new TypeError("invalid-temporal-timestamp");
    this.writeIndex = (this.writeIndex + 1) % this.profile.bufferCount;
    this.frameCount = Math.min(this.frameCount + 1, this.profile.bufferCount);
    this.lastCaptureAt = now;
    this.sequence += 1;
    return this.getStatus();
  }

  getCompositePlan(mode, outputWidth, capturedCurrent = false) {
    if (!["motion-trace", "time-echo"].includes(mode) ||
        !Number.isFinite(outputWidth) || outputWidth <= 0 ||
        !this.profile || this.frameCount < 2) return [];
    const firstAge = capturedCurrent ? 2 : 1;
    if (this.frameCount < firstAge) return [];
    const layers = [];
    for (let age = this.frameCount; age >= firstAge; age -= 1) {
      const index = (this.writeIndex - age + this.profile.bufferCount) % this.profile.bufferCount;
      const alpha = mode === "motion-trace"
        ? 0.08 + ((this.frameCount - age) * 0.025)
        : 0.12 + ((this.frameCount - age) * 0.035);
      layers.push({
        index, alpha,
        offset: mode === "time-echo" ? (this.frameCount - age + 1) * outputWidth * 0.004 : 0,
        age
      });
    }
    return layers;
  }

  getStatus() {
    return {
      configured: Boolean(this.profile),
      profile: this.profile ? { ...this.profile } : null,
      frameCount: this.frameCount, writeIndex: this.writeIndex,
      lastCaptureAt: this.lastCaptureAt, sequence: this.sequence
    };
  }

  reset() {
    this.profile = null;
    this.writeIndex = 0;
    this.frameCount = 0;
    this.lastCaptureAt = null;
    this.sequence = 0;
  }
}
