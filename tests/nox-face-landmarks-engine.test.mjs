import assert from "node:assert/strict";
import { NOXFaceLandmarksEngine } from "../core/nox-face-landmarks-engine.mjs";

const landmarks = Array.from({length: 478}, (_, i) => ({x:(i%20)/20,y:(i%17)/17,z:0}));
const chain = [{start:61,end:146},{start:146,end:91},{start:91,end:181}];
const engine = new NOXFaceLandmarksEngine();
const result = engine.analyze({
  detected:true, source:"mediapipe-face-landmarker-478", width:256, height:192,
  landmarks, connections:{
    lips:chain, leftEye:chain, rightEye:chain,
    leftEyebrow:chain, rightEyebrow:chain, faceOval:chain
  }
});
assert.equal(result.state,"complete");
assert.equal(result.landmarkCount,478);
assert.deepEqual(result.regions.lips.edges,[[61,146],[146,91],[91,181]]);
assert.equal(result.regions.lips.points.length,4);
assert.equal(result.regions.lips.source,"mediapipe-official-face-connections");
const partial=engine.analyze({
  detected:true, source:"mediapipe-face-landmarker-478", width:256,height:192,
  landmarks, connections:{lips:chain}
});
assert.equal(partial.state,"partial");
assert.ok(partial.unavailable.includes("leftEye"));
const invalid=engine.analyze({
  detected:true, source:"mediapipe-face-landmarker-478", width:256,height:192,
  landmarks, connections:{lips:[{start:999,end:1000}]}
});
assert.equal(invalid.state,"unavailable");
const missing=engine.analyze({detected:false});
assert.equal(missing.state,"unavailable");
console.log("NOX Face Landmarks Engine tests passed");
