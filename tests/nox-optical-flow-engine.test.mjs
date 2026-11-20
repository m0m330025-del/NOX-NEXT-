import assert from "node:assert/strict";
import { NOXSparseOpticalFlowEngine } from "../core/nox-optical-flow-engine.js";

const engine = new NOXSparseOpticalFlowEngine();
const defensiveEngine = new NOXSparseOpticalFlowEngine({ maxDimension: NaN, minConfidence: NaN });
assert.equal(defensiveEngine.maxDimension, 128, "invalid constructor dimensions use a safe default");
assert.equal(defensiveEngine.minConfidence, 0.06, "invalid confidence thresholds use a safe default");
const cappedEngine = new NOXSparseOpticalFlowEngine({ maxDimension: 10000, minConfidence: 4 });
assert.equal(cappedEngine.maxDimension, 256, "configured dimensions remain computationally bounded");
assert.equal(cappedEngine.minConfidence, 1, "confidence threshold is clamped to its valid range");
const width = 64;
const height = 48;
const previous = new Uint8Array(width * height);
let seed = 17;
for (let i = 0; i < previous.length; i += 1) {
  seed = (seed * 48271) % 2147483647;
  previous[i] = seed & 255;
}

// Current frame is the previous texture shifted one pixel to the right.
const current = new Uint8Array(width * height);
for (let y = 0; y < height; y += 1) {
  for (let x = 1; x < width; x += 1) {
    current[y * width + x] = previous[y * width + x - 1];
  }
}
const flow = engine.process(current, previous, width, height, {
  cellStep: 8, patchRadius: 1, searchRadius: 3
});
assert.ok(flow.sampleCount > 0, "textured translated frames should produce flow vectors");
assert.ok(flow.confidence > 0 && flow.confidence <= 1);
assert.ok(flow.vectors.every(vector =>
  Number.isFinite(vector.x) && Number.isFinite(vector.y) &&
  Number.isFinite(vector.dx) && Number.isFinite(vector.dy) &&
  vector.x >= 0 && vector.x <= 1 && vector.y >= 0 && vector.y <= 1 &&
  vector.confidence > 0 && vector.confidence <= 1
));
const averageDx = flow.vectors.reduce((sum, vector) => sum + vector.dx, 0) / flow.vectors.length;
assert.ok(averageDx > 0, "rightward frame motion must produce rightward flow vectors");

const safeOptionsFlow = engine.process(current, previous, width, height, {
  cellStep: NaN, patchRadius: NaN, searchRadius: NaN
});
assert.ok(safeOptionsFlow.sampleCount > 0, "invalid tuning values fall back to safe defaults");

const blank = new Uint8Array(width * height);
const still = engine.process(previous, previous, width, height);
assert.ok(still.sampleCount > 0, "textured still frames should provide zero-motion confidence samples");
assert.ok(still.vectors.every(vector => vector.dx === 0 && vector.dy === 0),
  "identical textured frames should report zero displacement");
assert.ok(still.confidence > 0 && still.confidence <= 1);
const blankStill = engine.process(blank, blank, width, height);
assert.equal(blankStill.sampleCount, 0, "textureless frames should not claim a motion estimate");
assert.equal(blankStill.confidence, 0);
assert.throws(() => engine.process(new Uint8Array(2), blank, width, height), /invalid-optical-flow-frame/);
assert.throws(() => engine.process(blank, blank, 512, 512), /invalid-optical-flow-frame/);
assert.throws(() => cappedEngine.process(new Uint8Array(257 * 257), new Uint8Array(257 * 257), 257, 257), /invalid-optical-flow-frame/);
engine.reset();
assert.equal(engine.lastResult, null);
console.log("NOX sparse optical flow engine tests passed");
