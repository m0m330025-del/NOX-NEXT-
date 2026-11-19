import assert from "node:assert/strict";
import { NOXSkinSegmentationEngine } from "../core/nox-skin-segmentation-engine.mjs";

const engine = new NOXSkinSegmentationEngine({
  minConfidence: 0.7, minCoverage: 0.05, maxCoverage: 0.8, minPixels: 3
});
const data = new Float32Array(100);
for (let y = 2; y < 8; y += 1) {
  for (let x = 2; x < 8; x += 1) data[y * 10 + x] = 0.95;
}
const accepted = engine.validateMask({
  data, width: 10, height: 10, confidence: 0.92,
  source: "test-segmentation-provider",
  faceBox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
});
assert.equal(accepted.state, "accepted");
assert.ok(accepted.pixelCount > 0);
assert.equal(accepted.mask.length, 100);
assert.ok(accepted.coverage >= 0.05);

assert.equal(engine.validateMask().reason, "invalid-mask");
assert.equal(engine.validateMask({
  data, width: 10, height: 10, confidence: 0.2,
  source: "provider", faceBox: {x:0.1,y:0.1,width:0.8,height:0.8}
}).reason, "low-confidence");
assert.equal(engine.validateMask({
  data, width: 10, height: 10, confidence: 0.9,
  source: "", faceBox: {x:0.1,y:0.1,width:0.8,height:0.8}
}).reason, "missing-mask-source");
assert.equal(engine.validateMask({
  data, width: 10, height: 10, confidence: 0.9,
  source: "provider"
}).reason, "missing-face-region");

const invalidValues = new Float32Array(100);
invalidValues[0] = 1.5;
assert.equal(engine.validateMask({
  data: invalidValues, width: 10, height: 10, confidence: 0.9,
  source: "provider", faceBox: {x:0,y:0,width:1,height:1}
}).reason, "invalid-mask-value");

engine.reset();
console.log("NOX Skin Segmentation Engine tests passed");
