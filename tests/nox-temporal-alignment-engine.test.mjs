import assert from "node:assert/strict";
import { NOXTemporalAlignmentEngine } from "../core/nox-temporal-alignment-engine.js";

const engine = new NOXTemporalAlignmentEngine();
engine.configure(3);
engine.onCapture(0);
engine.onCapture(1);

const vectors = Array.from({ length: 8 }, (_, index) => ({
  x: (index + 1) / 10, y: 0.5,
  dx: 0.01, dy: -0.005, confidence: 0.8
}));
const accepted = engine.ingest(vectors, { sequence: 1, width: 64, height: 48 });
assert.equal(accepted.accepted, true);
assert.ok(Math.abs(engine.getTransform(0).dx - 0.01) < 1e-9);
assert.ok(Math.abs(engine.getTransform(1).dy + 0.005) < 1e-9);
assert.equal(engine.getTransform(2).valid, false, "uncaptured slots must remain invalid");

const stale = engine.ingest(vectors, { sequence: 1, width: 64, height: 48 });
assert.equal(stale.reason, "stale-flow-sample");
const weak = vectors.map(vector => ({ ...vector, confidence: 0.05 }));
assert.equal(engine.ingest(weak, { sequence: 2, width: 64, height: 48 }).accepted, false);
const inconsistent = vectors.map((vector, index) => ({
  ...vector, dx: index % 2 ? 0.09 : -0.09
}));
assert.equal(engine.ingest(inconsistent, { sequence: 3, width: 64, height: 48 }).reason,
  "inconsistent-motion-vectors");

engine.onCapture(0);
assert.equal(engine.getTransform(0).dx, 0, "new captures reset accumulated translation");
engine.ingest(vectors, { sequence: 4, width: 64, height: 48 });
assert.ok(Math.abs(engine.getTransform(0).dx - 0.01) < 1e-9);
for (let sequence = 5; sequence < 30; sequence += 1) {
  engine.ingest(vectors, { sequence, width: 64, height: 48 });
}
assert.equal(engine.getTransform(0).valid, false, "large accumulated drift must invalidate a slot");
assert.throws(() => engine.configure(0), /invalid-temporal-alignment-slot-count/);
assert.throws(() => engine.onCapture(9), /invalid-temporal-alignment-slot/);
engine.reset();
assert.equal(engine.getStatus().slotCount, 0);
console.log("NOX temporal alignment engine tests passed");
