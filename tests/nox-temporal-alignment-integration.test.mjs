import assert from "node:assert/strict";
import { NOXSparseOpticalFlowEngine } from "../core/nox-optical-flow-engine.js";
import { NOXTemporalAlignmentEngine } from "../core/nox-temporal-alignment-engine.js";

const width = 64;
const height = 48;
const previous = new Uint8Array(width * height);
let seed = 91;
for (let i = 0; i < previous.length; i += 1) {
  seed = (seed * 48271) % 2147483647;
  previous[i] = seed & 255;
}

// The scene moves right by 2 pixels and up by 1 pixel between frames.
const current = new Uint8Array(width * height);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const sourceX = x - 2;
    const sourceY = y + 1;
    if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
      current[y * width + x] = previous[sourceY * width + sourceX];
    }
  }
}

const flowEngine = new NOXSparseOpticalFlowEngine();
const flow = flowEngine.process(current, previous, width, height, {
  cellStep: 8, patchRadius: 1, searchRadius: 3
});
assert.ok(flow.sampleCount >= 4, "synthetic translated texture must produce enough confident flow vectors");

const alignment = new NOXTemporalAlignmentEngine();
alignment.configure(1);
alignment.onCapture(0);
const accepted = alignment.ingest(flow.vectors, { sequence: 1, width, height });
assert.equal(accepted.accepted, true, "synthetic flow should be accepted by temporal alignment");

const transform = alignment.getTransform(0);
assert.equal(transform.valid, true);
assert.ok(Math.abs(transform.dx - (2 / width)) <= 1 / width,
  "old frame must shift right to follow the scene's rightward motion");
assert.ok(Math.abs(transform.dy - (-1 / height)) <= 1 / height,
  "old frame must shift up to follow the scene's upward motion");

console.log("NOX optical-flow to temporal-alignment integration test passed");
