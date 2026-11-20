import assert from "node:assert/strict";
import { NOXFacialMaskBuilder } from "../core/nox-facial-mask-builder.mjs";

const point = (x, y) => ({ x, y, z: 0 });
const landmarks = Array.from({ length: 478 }, () => point(0.98, 0.98));
landmarks.splice(0, 8,
  point(0.1,0.1), point(0.9,0.1), point(0.9,0.9), point(0.1,0.9),
  point(0.35,0.35), point(0.65,0.35), point(0.65,0.65), point(0.35,0.65)
);
const cycle = ids => ids.map((id, index) => ({ start: id, end: ids[(index + 1) % ids.length] }));
const triangles = [
  [0,1,5],[0,5,4],[1,2,6],[1,6,5],
  [2,3,7],[2,7,6],[3,0,4],[3,4,7]
];
const edges = [];
for (const [a,b,c] of triangles) {
  edges.push({start:a,end:b},{start:b,end:c},{start:c,end:a});
}
const builder = new NOXFacialMaskBuilder();
const input = {
  detected: true,
  source: "mediapipe-face-landmarker-478",
  width: 40, height: 40, landmarks,
  connections: { lips: [...cycle([0,1,2,3]), ...cycle([4,5,6,7])], tessellation: edges }
};
const result = builder.build(input);
assert.equal(result.state, "partial");
assert.ok(result.masks.lips);
assert.ok(result.masks.lips.pixelCount > 0);
assert.equal(result.masks.lips.confidence, null);
assert.match(result.masks.lips.usage, /not trusted/);

// A smaller contour outside the outer lip boundary must never produce a mask.
const outsideInner = builder.build({
  ...input,
  landmarks: input.landmarks.map((p, index) => index === 4 ? point(0.92,0.92) :
    index === 5 ? point(0.96,0.92) : index === 6 ? point(0.96,0.96) :
    index === 7 ? point(0.92,0.96) : p)
});
assert.equal(outsideInner.state, "unavailable");
assert.equal(outsideInner.reason, "invalid-or-nonnested-lip-contours");

// A self-crossing outer contour is rejected rather than rasterized.
const crossingOuter = builder.build({
  ...input,
  landmarks: input.landmarks.map((p, index) => index === 0 ? point(0.1,0.1) :
    index === 1 ? point(0.9,0.9) : index === 2 ? point(0.9,0.1) :
    index === 3 ? point(0.1,0.9) : p)
});
assert.equal(crossingOuter.state, "unavailable");
assert.equal(crossingOuter.reason, "invalid-or-nonnested-lip-contours");
assert.ok(result.unavailable.includes("leftEyelid"));
const mask = result.masks.lips.data;
assert.equal(mask[20 * 40 + 20], 0, "inner mouth opening must remain unpainted");
assert.equal(mask[20 * 40 + 5], 1, "lip annulus must be rasterized");
assert.equal(mask[20 * 40 + 0], 0, "outside face must remain unpainted");

const missingInner = builder.build({
  ...input,
  connections: { lips: cycle([0,1,2,3]), tessellation: edges }
});
assert.equal(missingInner.state, "unavailable");
assert.equal(missingInner.reason, "closed-lip-loops-or-tessellation-missing");

const invalid = builder.build({ ...input, landmarks: [{x:2,y:0.2}] });
assert.equal(invalid.state, "unavailable");
const tooLarge = builder.build(input, { width: 2048, height: 2048 });
assert.equal(tooLarge.state, "unavailable");

// Reject pathological mesh hubs before quadratic triangle reconstruction.
const highDegreeEdges = Array.from({ length: 65 }, (_, index) => ({
  start: 0, end: index + 8
}));
const excessiveDegree = builder.build({
  ...input,
  connections: {
    lips: input.connections.lips,
    tessellation: highDegreeEdges
  }
});
assert.equal(excessiveDegree.state, "unavailable");
assert.equal(excessiveDegree.reason, "closed-lip-loops-or-tessellation-missing");

// Reject edge lists above the configured mesh input budget.
const manyLandmarks = Array.from({ length: 478 }, () => point(0.98, 0.98));
manyLandmarks.splice(0, 8,
  point(0.1,0.1), point(0.9,0.1), point(0.9,0.9), point(0.1,0.9),
  point(0.35,0.35), point(0.65,0.35), point(0.65,0.65), point(0.35,0.65)
);
const excessiveEdges = Array.from({ length: 20_001 }, (_, index) => ({
  start: 0, end: (index % 477) + 1
}));
const tooManyEdges = builder.build({
  ...input,
  landmarks: manyLandmarks,
  connections: {
    lips: input.connections.lips,
    tessellation: excessiveEdges
  }
});
assert.equal(tooManyEdges.state, "unavailable");
assert.equal(tooManyEdges.reason, "closed-lip-loops-or-tessellation-missing");
console.log("NOX Facial Mask Builder tests passed");
