import assert from "node:assert/strict";
import { NOXFaceLandmarksEngine } from "../core/nox-face-landmarks-engine.mjs";

const landmarks = Array.from({ length: 478 }, (_, index) => ({
  x: 0.2 + (index % 20) * 0.01,
  y: 0.2 + Math.floor(index / 20) * 0.01,
  z: 0
}));
const edges = [{ start: 1, end: 2 }, { start: 2, end: 3 }, { start: 3, end: 4 }];
const result = {
  detected: true,
  source: "mediapipe-face-landmarker-478",
  landmarks,
  width: 256,
  height: 192,
  frameId: "nox-face-landmarks-44",
  timestamp: 1730000000000,
  capturedAtMonotonicMs: 918.5,
  coordinateSpace: "source-unmirrored-normalized",
  connections: { leftEye: edges, rightEye: edges, lips: edges, faceOval: edges }
};
const analysis = new NOXFaceLandmarksEngine().analyze(result);
assert.equal(analysis.state, "partial");
assert.equal(analysis.frameId, result.frameId);
assert.equal(analysis.timestamp, result.timestamp);
assert.equal(analysis.capturedAtMonotonicMs, result.capturedAtMonotonicMs);
assert.equal(analysis.coordinateSpace, result.coordinateSpace);
assert.equal(analysis.width, result.width);
assert.equal(analysis.height, result.height);
console.log("NOX face landmarks provenance tests passed");
