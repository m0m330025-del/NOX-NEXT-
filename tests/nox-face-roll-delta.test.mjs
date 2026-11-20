import assert from "node:assert/strict";
import { calculateNOXFaceRollDelta } from "../core/nox-face-roll-delta.js";

const estimate = (id, angle, time, width = 640, height = 480, coordinateSpace = "source-unmirrored-normalized") => ({
  state: "estimated", angleRadians: angle,
  frame: { id, capturedAtMonotonicMs: time, width, height, coordinateSpace }
});
const captured = estimate("mask-frame", 0.1, 1000);
const same = calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("current-1", 0.1, 1050), nowMonotonicMs: 1060 });
assert.equal(same.state, "accepted");
assert.ok(Math.abs(same.deltaRadians) < 1e-9, "same roll must produce zero correction");
const positive = calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("current-2", 0.2, 1050), nowMonotonicMs: 1060 });
assert.ok(positive.state === "accepted" && Math.abs(positive.deltaRadians - 0.1) < 1e-9);
const negative = calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("current-3", 0, 1050), nowMonotonicMs: 1060 });
assert.ok(negative.state === "accepted" && Math.abs(negative.deltaRadians + 0.1) < 1e-9);
assert.equal(calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("stale", 0.2, 700), nowMonotonicMs: 1000 }).reason, "stale-roll-measurement");
assert.equal(calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("future", 0.2, 1100), nowMonotonicMs: 1000 }).reason, "stale-roll-measurement");
assert.equal(calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("wrong-size", 0.2, 1050, 1280, 720), nowMonotonicMs: 1060 }).reason, "roll-frame-mismatch");
assert.equal(calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("wrong-space", 0.2, 1050, 640, 480, "display-mirrored"), nowMonotonicMs: 1060 }).reason, "roll-frame-mismatch");
assert.equal(calculateNOXFaceRollDelta({ capturedRoll: captured, currentRoll: estimate("large-delta", 0.8, 1050), nowMonotonicMs: 1060 }).reason, "roll-delta-exceeds-safe-limit");
const wrap = calculateNOXFaceRollDelta({ capturedRoll: estimate("wrap-a", Math.PI - 0.05, 1000), currentRoll: estimate("wrap-b", -Math.PI + 0.05, 1050), nowMonotonicMs: 1060 });
assert.equal(wrap.state, "accepted");
assert.ok(Math.abs(wrap.deltaRadians - 0.1) < 1e-8, "angle delta must use shortest wrapped path");
assert.equal(calculateNOXFaceRollDelta({ capturedRoll: { ...captured, frame: { ...captured.frame, capturedAtMonotonicMs: undefined } }, currentRoll: estimate("x", 0.2, 1050), nowMonotonicMs: 1060 }).state, "rejected");
console.log("NOX face roll delta tests passed");
