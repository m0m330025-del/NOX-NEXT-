import assert from "node:assert/strict";
import { NOXPredictiveCameraIntelligence } from "../core/nox-predictive-camera-intelligence.js";

const makeVectors = (dx, dy, confidence = 0.8, count = 8) =>
  Array.from({ length: count }, (_, index) => ({
    x: (index + 1) / (count + 1),
    y: 0.5,
    dx,
    dy,
    confidence
  }));

const engine = new NOXPredictiveCameraIntelligence();
assert.equal(engine.evaluate({ nowMs: 0 }).reason, "insufficient-flow-history");

assert.equal(engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 100, sequence: 1 }).accepted, true);
assert.equal(engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 200, sequence: 2 }).accepted, true);
const steady = engine.evaluate({ nowMs: 220, frameCostMs: 8, targetFrameMs: 33.3 });
assert.equal(steady.action, "report-short-horizon-estimate");
assert.ok(Math.abs(steady.prediction.dx - 0.01) < 1e-9);
assert.ok(steady.confidence > 0.3);

engine.reset();
engine.observe({ vectors: makeVectors(0.005, 0), timestampMs: 100, sequence: 1 });
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 200, sequence: 2 });
const accelerating = engine.evaluate({ nowMs: 210 });
assert.ok(accelerating.prediction.dx > 0.01);

engine.reset();
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 100, sequence: 1 });
engine.observe({ vectors: makeVectors(0, 0.01), timestampMs: 200, sequence: 2 });
const turning = engine.evaluate({ nowMs: 210 });
assert.ok(turning.prediction);
assert.ok(turning.confidence < steady.confidence);

engine.reset();
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 100, sequence: 1 });
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 200, sequence: 2 });
assert.equal(engine.evaluate({ nowMs: 1000 }).reason, "flow-sample-stale-or-clock-invalid");
assert.equal(engine.evaluate({ nowMs: 210 }).prediction !== null, true);

engine.reset();
assert.equal(engine.observe({ vectors: makeVectors(0.01, 0, 0.03), timestampMs: 100, sequence: 1 }).reason,
  "insufficient-confident-flow-vectors");

engine.reset();
const conflicting = [
  ...makeVectors(0.02, 0, 0.8, 4),
  ...makeVectors(-0.02, 0, 0.8, 4)
];
assert.equal(engine.observe({ vectors: conflicting, timestampMs: 100, sequence: 1 }).reason,
  "conflicting-or-low-confidence-flow");

engine.reset();
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 100, sequence: 1 });
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 200, sequence: 2 });
const protectedPlan = engine.evaluate({ nowMs: 210, frameCostMs: 32, targetFrameMs: 33.3 });
assert.equal(protectedPlan.action, "defer-prediction-analysis");
assert.equal(protectedPlan.prediction, null);
assert.equal(protectedPlan.reason, "frame-budget-protection");

engine.reset();
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 100, sequence: 1 });
assert.equal(engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 90, sequence: 2 }).reason,
  "stale-or-duplicate-flow-observation");
assert.equal(engine.evaluate({ nowMs: 110 }).prediction, null);

engine.reset();
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 100, sequence: 1 });
engine.observe({ vectors: makeVectors(0.01, 0), timestampMs: 900, sequence: 2 });
assert.equal(engine.evaluate({ nowMs: 910 }).prediction, null);
assert.equal(engine.evaluate({ nowMs: 910 }).reason, "need-two-timed-flow-samples");

console.log("NOX Predictive Camera Intelligence deterministic tests passed");
