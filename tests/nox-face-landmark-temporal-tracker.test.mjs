import assert from "node:assert/strict";
import { NOXFaceLandmarkTemporalTracker } from "../core/nox-face-landmark-temporal-tracker.mjs";

const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
const oval = [0,1,2,3,4,5,6,7].map((id, i) => ({ start: id, end: (id + 1) % 8 }));
const base = {
  detected: true, source: "mediapipe-face-landmarker-478", width: 256, height: 192,
  landmarks: points.map((point, i) => i < 8 ? [
    {x:0.3,y:0.2,z:0},{x:0.7,y:0.2,z:0},{x:0.75,y:0.5,z:0},{x:0.7,y:0.8,z:0},
    {x:0.3,y:0.8,z:0},{x:0.25,y:0.5,z:0},{x:0.4,y:0.25,z:0},{x:0.6,y:0.25,z:0}
  ][i] : point),
  connections: { faceOval: oval }
};
const tracker = new NOXFaceLandmarkTemporalTracker({ smoothing: 0.5, maxMissedFrames: 2 });
const acquired = tracker.update(base);
assert.equal(acquired.state, "acquired");
assert.equal(acquired.face.landmarks.length, 478);
const moved = {
  ...base,
  landmarks: base.landmarks.map((point, i) => ({ ...point, x: point.x + (i >= 8 ? 0.1 : 0.02) }))
};
const tracked = tracker.update(moved);
assert.equal(tracked.state, "tracking");
assert.ok(Math.abs(tracked.face.landmarks[20].x - (base.landmarks[20].x + 0.05)) < 1e-9);
assert.equal(tracker.update({ detected: false }).state, "coasting");
assert.equal(tracker.update({ detected: false }).state, "coasting");
assert.equal(tracker.update({ detected: false }).state, "lost");
assert.equal(tracker.update({ detected: false }).face, null);
tracker.reset();
assert.equal(tracker.update(base).state, "acquired");
const invalid = tracker.update({ ...base, landmarks: [{ x: 2, y: 0.2 }] });
assert.equal(invalid.state, "coasting");
const jump = {
  ...base,
  landmarks: base.landmarks.map((point, i) => i < 8
    ? { ...point, x: Math.min(0.99, point.x + 0.25) } : point)
};
const unconfirmedJump = tracker.update(jump);
assert.equal(unconfirmedJump.state, "coasting");
assert.equal(unconfirmedJump.reason, "unconfirmed-large-displacement");
assert.ok(Math.abs(unconfirmedJump.face.box.x - 0.3) < 1e-9);

// The same displaced face on the next frame confirms reacquisition.
const confirmedJump = tracker.update(jump);
assert.equal(confirmedJump.state, "acquired");
assert.equal(confirmedJump.reacquired, true);
assert.equal(confirmedJump.reason, "confirmed-large-displacement");
assert.ok(confirmedJump.face.box.x > unconfirmedJump.face.box.x);

// A second, inconsistent jump candidate must not steal the existing track.
tracker.reset();
tracker.update(base);
const firstCandidate = tracker.update(jump);
assert.equal(firstCandidate.state, "coasting");
const otherCandidate = {
  ...base,
  landmarks: base.landmarks.map((point, i) => i < 8
    ? { ...point, x: Math.max(0.01, point.x - 0.25) } : point)
};
const inconsistent = tracker.update(otherCandidate);
assert.equal(inconsistent.state, "coasting");
assert.equal(inconsistent.reason, "unconfirmed-large-displacement");
assert.ok(Math.abs(inconsistent.face.box.x - 0.3) < 1e-9);
console.log("NOX Face Landmark Temporal Tracker tests passed");
