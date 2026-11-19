import assert from "node:assert/strict";
import { NOXFaceRegionEngine } from "../core/nox-face-region-engine.mjs";

const engine = new NOXFaceRegionEngine();
const result = engine.analyze({
  landmarks: [
    { type: "eye", points: [{x:0.2,y:0.3},{x:0.3,y:0.32},{x:0.25,y:0.4}] },
    { type: "mouth", points: [{x:0.4,y:0.7},{x:0.6,y:0.75}] },
    { type: "unknown", points: [{x:0.1,y:0.1},{x:0.9,y:0.9}] }
  ]
});
assert.equal(result.state, "partial");
assert.equal(result.regions.eyes.pointCount, 3);
assert.equal(result.regions.mouth.bounds.x, 0.4);
assert.equal(result.regions.brows, undefined);
assert.equal(result.regions.cheeks, undefined);
assert.ok(result.unavailable.includes("brows"));
assert.ok(result.unavailable.includes("cheeks"));

const empty = engine.analyze({ landmarks: [] });
assert.equal(empty.state, "unavailable");
assert.deepEqual(Object.keys(empty.regions), []);

const invalid = engine.analyze({
  landmarks: [{ type: "eye", points: [{x:2,y:0.2},{x:0.3,y:0.3}] }]
});
assert.equal(invalid.state, "unavailable");
console.log("NOX Face Region Engine tests passed");
