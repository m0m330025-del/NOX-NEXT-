/**
 * NOX Live Makeup Controller.
 * Serializes asynchronous frame processing and drops stale results.
 */
export class NOXLiveMakeupController {
  constructor({ intervalMs = 180, maxResultAgeMs = 420,
    clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
    schedule = (callback, delay) => setTimeout(callback, delay),
    cancel = handle => clearTimeout(handle) } = {}) {
    if (!Number.isFinite(intervalMs) || intervalMs < 16) throw new RangeError("invalid-live-makeup-interval");
    if (!Number.isFinite(maxResultAgeMs) || maxResultAgeMs < intervalMs) throw new RangeError("invalid-live-makeup-result-age");
    if (typeof clock !== "function" || typeof schedule !== "function" || typeof cancel !== "function") throw new TypeError("invalid-live-makeup-runtime");
    Object.assign(this, { intervalMs, maxResultAgeMs, clock, schedule, cancel });
    this.timer = null; this.controller = null; this.running = false; this.inFlight = false;
    this.sequence = 0; this.lastAcceptedSequence = 0;
  }
  start({ captureFrame, processFrame, onResult, onError } = {}) {
    if (this.running) return false;
    if (typeof captureFrame !== "function" || typeof processFrame !== "function" || typeof onResult !== "function") throw new TypeError("live-makeup-callbacks-required");
    Object.assign(this, { captureFrame, processFrame, onResult, onError: typeof onError === "function" ? onError : () => {} });
    this.running = true; this.controller = new AbortController(); this.scheduleNext(0); return true;
  }
  scheduleNext(delay) {
    if (!this.running || this.timer !== null) return;
    this.timer = this.schedule(() => { this.timer = null; void this.processNext(); }, delay);
  }
  async processNext() {
    if (!this.running || this.inFlight) return;
    this.inFlight = true;
    const sessionController = this.controller;
    const sequence = ++this.sequence, capturedAt = this.clock();
    try {
      const frame = await this.captureFrame({ sequence, capturedAt, signal: this.controller.signal });
      if (!this.running || sessionController.signal.aborted) return;
      if (!frame || typeof frame !== "object") throw new TypeError("live-makeup-frame-required");
      const result = await this.processFrame(frame, { sequence, capturedAt, signal: this.controller.signal });
      const ageMs = Math.max(0, this.clock() - capturedAt);
      if (!this.running || this.controller.signal.aborted || sequence !== this.sequence || ageMs > this.maxResultAgeMs || !result) return;
      this.lastAcceptedSequence = sequence; this.onResult({ sequence, capturedAt, ageMs, frame, result });
    } catch (error) {
      if (this.running && !this.controller.signal.aborted) this.onError(error, { sequence, capturedAt });
    } finally {
      this.inFlight = false;
      if (this.running) this.scheduleNext(Math.max(0, this.intervalMs - Math.max(0, this.clock() - capturedAt)));
    }
  }
  stop() {
    if (!this.running && this.timer === null) return false;
    this.running = false;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null; this.controller?.abort(); this.controller = null;
    this.captureFrame = this.processFrame = this.onResult = this.onError = null;
    return true;
  }
  getStatus() {
    return { running: this.running, inFlight: this.inFlight, sequence: this.sequence,
      lastAcceptedSequence: this.lastAcceptedSequence, intervalMs: this.intervalMs, maxResultAgeMs: this.maxResultAgeMs };
  }
}
