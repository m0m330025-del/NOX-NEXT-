import assert from "node:assert/strict";
import { NOXLiveMakeupController } from "../core/nox-live-makeup-controller.mjs";
let now = 100, nextId = 1;
const queue = [];
const schedule = (callback, delay) => { const item = { id: nextId++, callback, delay, cancelled: false }; queue.push(item); return item; };
const cancel = item => { item.cancelled = true; };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const runNext = async () => { const item = queue.shift(); assert.ok(item); if (!item.cancelled) item.callback(); await flush(); };
const accepted = [], errors = [];
const controller = new NOXLiveMakeupController({ intervalMs: 100, maxResultAgeMs: 250, clock: () => now, schedule, cancel });
assert.equal(controller.start({
  captureFrame: async ({ sequence }) => ({ id: sequence }),
  processFrame: async frame => ({ output: frame.id }),
  onResult: value => accepted.push(value), onError: error => errors.push(error)
}), true);
await runNext();
assert.equal(accepted.length, 1);
assert.equal(accepted[0].sequence, 1);
assert.equal(accepted[0].result.output, 1);
assert.equal(controller.getStatus().lastAcceptedSequence, 1);
assert.equal(controller.start({ captureFrame: () => ({}), processFrame: () => ({}), onResult: () => {} }), false);
controller.stop();
assert.equal(controller.getStatus().running, false);
assert.equal(errors.length, 0);

let resolveSlow;
const stale = new NOXLiveMakeupController({ intervalMs: 100, maxResultAgeMs: 150, clock: () => now, schedule, cancel });
const staleAccepted = [];
stale.start({
  captureFrame: async () => ({ id: "slow" }),
  processFrame: () => new Promise(resolve => { resolveSlow = resolve; }),
  onResult: value => staleAccepted.push(value)
});
const pending = runNext();
await flush();
assert.equal(typeof resolveSlow, "function");
now += 200;
resolveSlow({ output: "too-late" });
await pending;
assert.equal(staleAccepted.length, 0);
stale.stop();

let resolveAfterStop;
const stoppedAccepted = [];
const stopped = new NOXLiveMakeupController({ intervalMs: 100, maxResultAgeMs: 200, clock: () => now, schedule, cancel });
stopped.start({
  captureFrame: async () => ({ id: "stop" }),
  processFrame: () => new Promise(resolve => { resolveAfterStop = resolve; }),
  onResult: value => stoppedAccepted.push(value)
});
const stoppedPending = runNext();
await flush();
stopped.stop();
resolveAfterStop({ output: "after-stop" });
await stoppedPending;
assert.equal(stoppedAccepted.length, 0);
console.log("NOX Live Makeup Controller tests passed");
