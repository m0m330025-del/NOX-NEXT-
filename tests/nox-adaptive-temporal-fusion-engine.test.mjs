import assert from "node:assert/strict";
import { NOXAdaptiveTemporalFusionEngine } from "../core/nox-adaptive-temporal-fusion-engine.js";

const engine = new NOXAdaptiveTemporalFusionEngine();
const layers = [
  { index: 0, age: 1, alpha: 0.2 },
  { index: 1, age: 2, alpha: 0.2 },
  { index: 2, age: 4, alpha: 0.2 },
  { index: 3, age: 5, alpha: 0.2 }
];
const alignments = [
  { index: 0, valid: true, confidence: 0.95 },
  { index: 1, valid: true, confidence: 0.75 },
  { index: 2, valid: true, confidence: 0.9 },
  { index: 3, valid: true, confidence: 0.99 }
];
const motion = {
  accepted: true, confidence: 0.8, backgroundRatio: 0.75
};
const result = engine.plan({ layers, alignments, motion });
assert.deepEqual(result.layers.map(layer => layer.index), [0, 1, 2]);
assert.equal(result.rejected.find(item => item.index === 3).reason, "layer-age-out-of-range");
assert.ok(result.layers[0].alpha > result.layers[1].alpha);
assert.ok(result.layers[1].alpha > result.layers[2].alpha);
assert.ok(result.layers.every(layer => layer.alpha >= 0 && layer.alpha <= 1));
assert.equal(result.status.accepted, true);

const weakAlignment = engine.plan({
  layers: [{ index: 8, age: 1, alpha: 0.3 }],
  alignments: [{ index: 8, valid: true, confidence: 0.05 }],
  motion
});
assert.equal(weakAlignment.layers.length, 0);
assert.equal(weakAlignment.rejected[0].reason, "alignment-confidence-too-low");

const ambiguousMotion = engine.plan({
  layers: [{ index: 0, age: 1, alpha: 0.3 }],
  alignments: [{ index: 0, valid: true, confidence: 1 }],
  motion: { accepted: false, confidence: 0, backgroundRatio: 0 }
});
assert.equal(ambiguousMotion.layers.length, 0);
assert.equal(ambiguousMotion.rejected[0].reason, "global-motion-evidence-unavailable");

const insufficientBackground = engine.plan({
  layers: [{ index: 0, age: 1, alpha: 0.3 }],
  alignments: [{ index: 0, valid: true, confidence: 1 }],
  motion: { accepted: true, confidence: 0.9, backgroundRatio: 0.4 }
});
assert.equal(insufficientBackground.layers.length, 0);

engine.reset();
assert.equal(engine.getStatus().reason, "no-fusion-decision");
console.log("NOX Adaptive Temporal Fusion deterministic tests passed");
