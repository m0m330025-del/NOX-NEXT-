import assert from "node:assert/strict";
import { estimateNOXFaceRoll } from "../core/nox-face-roll-estimator.mjs";

function eyePoints(indices, x, y) {
  return { points: indices.map((index, i) => ({
    index, x: x + (i % 2) * 0.01, y: y + Math.floor(i / 2) * 0.01
  })) };
}
const base = {
  source: "mediapipe-face-landmarker-478",
  width: 640, height: 480, landmarkCount: 478,
  regions: {
    leftEye: eyePoints([1,2,3,4], 0.25, 0.4),
    rightEye: eyePoints([5,6,7,8], 0.65, 0.4)
  }
};
const level = estimateNOXFaceRoll(base);
assert.equal(level.state, "estimated");
assert.ok(Math.abs(level.angleRadians) < 0.04, "level eyes should produce near-zero roll");
const tilted = structuredClone(base);
for (const key of ["leftEye", "rightEye"]) {
  tilted.regions[key].points = tilted.regions[key].points.map(point => ({
    ...point, y: point.y + (point.x - 0.25) * 0.25
  }));
}
const roll = estimateNOXFaceRoll(tilted);
assert.equal(roll.state, "estimated");
assert.ok(roll.angleRadians > 0.15 && roll.angleRadians < 0.35,
  "eye baseline should report a positive in-plane roll");
assert.equal(estimateNOXFaceRoll({ ...base, source: "unknown" }).state, "unavailable");
assert.equal(estimateNOXFaceRoll({ ...base, regions: { leftEye: base.regions.leftEye } }).reason,
  "insufficient-eye-landmarks");
const malformed = structuredClone(base);
malformed.regions.rightEye.points[0].x = Number.NaN;
assert.equal(estimateNOXFaceRoll(malformed).state, "unavailable",
  "non-finite landmark coordinates must be rejected");
const degenerate = structuredClone(base);
degenerate.regions.rightEye = eyePoints([5,6,7,8], 0.251, 0.4);
assert.equal(estimateNOXFaceRoll(degenerate).reason, "degenerate-eye-baseline");
console.log("NOX face roll estimator tests passed");
