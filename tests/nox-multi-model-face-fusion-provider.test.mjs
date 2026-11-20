import assert from "node:assert/strict";
import { NOXMultiModelFaceFusionProvider } from "../core/nox-multi-model-face-fusion-provider.mjs";

const width = 100, height = 100, timestamp = 1000, frameId = "f-1";
const faceBox = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
const connections = { faceOval: Array.from({length: 12}, (_, i) => ({start:i,end:(i+1)%12})) };
const landmarks = Array.from({length: 478}, (_, i) => {
  if (i < 12) {
    const angle = (i / 12) * Math.PI * 2;
    return { x: 0.5 + Math.cos(angle) * 0.3, y: 0.5 + Math.sin(angle) * 0.3, z: 0 };
  }
  return { x: 0.5, y: 0.5, z: 0 };
});
const detected = { detected:true, source:"mediapipe-face-landmarker-478", width,height,
  landmarks, connections };
function makeProvider({ detection = detected, segmentation = {} } = {}) {
  return new NOXMultiModelFaceFusionProvider({
    segmentationProvider: {
      initialize: async () => ({available:true}),
      segment: async frame => ({width:frame.width,height:frame.height,frameId:frame.frameId,
        timestamp:frame.timestamp,source:"bisenet-test",faceBox,
        skin:{data:new Float32Array(width*height).fill(0.9),confidence:0.95},
        regions:{lips:{data:new Float32Array(width*height).fill(0.9),confidence:0.95}},
        ...segmentation})
    },
    landmarkProvider: { initialize:async()=>({available:true}), detect:()=>detection }
  });
}
const frame={source:{width,height},width,height,frameId,timestamp};
const fusion=makeProvider();
assert.equal((await fusion.initialize()).fusionMode,"dual-model");
const result=await fusion.segment(frame);
assert.equal(result.fusion.state,"fused");
assert.equal(result.fusion.landmarkStatus,"aligned");
assert.equal(result.landmarks.state,"partial");
assert.equal(result.regions.lips.confidence,0.95);

const noFace=makeProvider({detection:{detected:false}});
await noFace.initialize();
const partial=await noFace.segment(frame);
assert.equal(partial.fusion.state,"partial");
assert.equal(partial.fusion.landmarkStatus,"unavailable");
assert.ok(partial.regions.lips,"valid segmentation remains available when landmarks fail");

const wrongSize=makeProvider({detection:{...detected,width:80}});
await wrongSize.initialize();
assert.equal((await wrongSize.segment(frame)).fusion.landmarkStatus,"dimension-mismatch");

const mismatch=makeProvider({segmentation:{frameId:"wrong"}});
await mismatch.initialize();
await assert.rejects(()=>mismatch.segment(frame),/fusion-segmentation-frame-mismatch/);

const required=makeProvider({detection:{detected:false}});
required.requireLandmarks=true;
await required.initialize();
await assert.rejects(()=>required.segment(frame),/required-landmark-fusion-unavailable/);

await fusion.dispose();
console.log("NOX Multi-Model Face Fusion tests passed");
