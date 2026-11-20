/**
 * NOX Live Makeup Controller.
 * Serializes frame processing within a session and drops stale session results.
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
    this.timer = null; this.controller = null; this.running = false; this.inFlight = null;
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
    const sessionController = this.controller;
    const task = { sessionController };
    this.inFlight = task;
    const sequence = ++this.sequence, capturedAt = this.clock();
    try {
      const frame = await this.captureFrame({ sequence, capturedAt, signal: sessionController.signal });
      if (!this.running || this.controller !== sessionController || sessionController.signal.aborted) return;
      if (!frame || typeof frame !== "object") throw new TypeError("live-makeup-frame-required");
      const result = await this.processFrame(frame, { sequence, capturedAt, signal: sessionController.signal });
      const ageMs = Math.max(0, this.clock() - capturedAt);
      if (!this.running || this.controller !== sessionController || sessionController.signal.aborted ||
          sequence !== this.sequence || ageMs > this.maxResultAgeMs || !result) return;
      this.lastAcceptedSequence = sequence; this.onResult({ sequence, capturedAt, ageMs, frame, result });
    } catch (error) {
      if (this.running && this.controller === sessionController && !sessionController.signal.aborted) {
        this.onError(error, { sequence, capturedAt });
      }
    } finally {
      // A stopped session must never clear or reschedule work belonging to a newer session.
      if (this.inFlight === task) this.inFlight = null;
      if (this.running && this.controller === sessionController && !sessionController.signal.aborted) {
        this.scheduleNext(Math.max(0, this.intervalMs - Math.max(0, this.clock() - capturedAt)));
      }
    }
  }
  stop() {
    if (!this.running && this.timer === null && this.inFlight === null) return false;
    this.running = false;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    const stoppedController = this.controller;
    this.controller = null;
    stoppedController?.abort();
    // Release the session lock immediately. An uncooperative old inference may finish
    // later, but it cannot block or mutate the newly started camera session.
    if (this.inFlight?.sessionController === stoppedController) this.inFlight = null;
    this.captureFrame = this.processFrame = this.onResult = this.onError = null;
    return true;
  }
  getStatus() {
    return { running: this.running, inFlight: this.inFlight !== null, sequence: this.sequence,
      lastAcceptedSequence: this.lastAcceptedSequence, intervalMs: this.intervalMs, maxResultAgeMs: this.maxResultAgeMs };
  }
}
