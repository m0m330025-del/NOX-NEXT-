import assert from "node:assert/strict";
import { calculateNOXPredictiveStabilizationCorrection as calculate } from "../core/nox-predictive-stabilization-assist.js";

const trusted = {
  measuredDx: 0.01,
  measuredDy: -0.01,
  prediction: { dx: 0.02, dy: -0.02 },
  predictionAction: "report-short-horizon-estimate",
  predictionConfidence: 0.8,
  predictionHorizonMs: 120,
  frameCostMs: 8,
  targetFrameMs: 33.3
};
const combined = calculate(trusted);
assert.equal(combined.predictionUsed, true);
assert.ok(Math.abs(combined.dx - 0.0108) < 1e-12);
assert.ok(Math.abs(combined.dy + 0.0108) < 1e-12);
assert.equal(combined.reason, "measured-motion-plus-trusted-prediction");

const lowConfidence = calculate({ ...trusted, predictionConfidence: 0.19 });
assert.equal(lowConfidence.predictionUsed, false);
assert.equal(lowConfidence.dx, 0.0072);

const stale = calculate({ ...trusted, predictionHorizonMs: 251 });
assert.equal(stale.predictionUsed, false);
const missingAction = calculate({ ...trusted, predictionAction: "hold" });
assert.equal(missingAction.predictionUsed, false);
const invalidVector = calculate({ ...trusted, prediction: { dx: NaN, dy: 0.02 } });
assert.equal(invalidVector.predictionUsed, false);
const invalidHorizon = calculate({ ...trusted, predictionHorizonMs: Infinity });
assert.equal(invalidHorizon.predictionUsed, false);

const overloaded = calculate({ ...trusted, frameCostMs: 31, targetFrameMs: 33.3 });
assert.equal(overloaded.predictionUsed, false);
assert.equal(overloaded.reason, "frame-budget-protection");
assert.equal(overloaded.dx, 0.0072);

const clamped = calculate({
  measuredDx: 1,
  measuredDy: -1,
  prediction: { dx: 0.06, dy: -0.06 },
  predictionAction: "report-short-horizon-estimate",
  predictionConfidence: 1,
  predictionHorizonMs: 100,
  frameCostMs: 1,
  targetFrameMs: 33
});
assert.equal(clamped.dx, 0.025);
assert.equal(clamped.dy, -0.025);

const malformedMeasured = calculate({ measuredDx: NaN, measuredDy: Infinity });
assert.equal(malformedMeasured.dx, 0);
assert.equal(malformedMeasured.dy, 0);

const absentBudget = calculate({ ...trusted, frameCostMs: null, targetFrameMs: null });
assert.equal(absentBudget.predictionUsed, true);
console.log("NOX Predictive Stabilization Assist deterministic tests passed");
