import assert from "node:assert/strict";
import { NOXSmartMotionSeparationEngine } from "../core/nox-smart-motion-separation-engine.js";
import { NOXTemporalAlignmentEngine } from "../core/nox-temporal-alignment-engine.js";

const background = [];
for (const y of [0.1, 0.35, 0.65, 0.9]) {
  for (const x of [0.1, 0.35, 0.65, 0.9]) {
    background.push({ x, y, dx: 0.012, dy: -0.006, confidence: 0.82 });
  }
}
const movingSubject = [
  { x: 0.46, y: 0.42, dx: -0.045, dy: 0.028, confidence: 0.9 },
  { x: 0.56, y: 0.48, dx: -0.044, dy: 0.029, confidence: 0.88 },
  { x: 0.64, y: 0.55, dx: -0.046, dy: 0.027, confidence: 0.86 }
];

const engine = new NOXSmartMotionSeparationEngine();
const separated = engine.process([...background, ...movingSubject]);
assert.equal(separated.accepted, true);
assert.equal(separated.backgroundCount, background.length);
assert.equal(separated.outlierCount, movingSubject.length);
assert.equal(separated.localizedMotionCount, movingSubject.length);
assert.ok(Math.abs(separated.dx - 0.012) < 1e-9);
assert.ok(Math.abs(separated.dy + 0.006) < 1e-9);

const alignment = new NOXTemporalAlignmentEngine();
alignment.configure(1);
alignment.onCapture(0);
const aligned = alignment.ingest(separated.globalVectors, {
  sequence: 1, width: 64, height: 48
});
assert.equal(aligned.accepted, true);
assert.ok(Math.abs(alignment.getTransform(0).dx - 0.012) < 1e-9,
  "temporal alignment must use the global background consensus, not local outlier motion");

const competing = engine.process([
  ...background.slice(0, 8),
  ...background.slice(8, 16).map(vector => ({ ...vector, dx: -0.04, dy: 0.03 }))
]);
assert.equal(competing.accepted, false,
  "two equally sized motion populations must not be guessed as camera motion");

const localOnly = engine.process(movingSubject);
assert.equal(localOnly.accepted, false,
  "localized motion alone must not be accepted as global camera movement");

assert.equal(engine.process(null).reason, "invalid-motion-vector-set");
engine.reset();
assert.equal(engine.getStatus().reason, "no-motion-sample");

console.log("NOX Smart Motion Separation deterministic tests passed");
