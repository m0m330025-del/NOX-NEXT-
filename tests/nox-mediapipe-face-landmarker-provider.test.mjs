import assert from "node:assert/strict";
import { NOXMediaPipeFaceLandmarkerProvider } from "../core/nox-mediapipe-face-landmarker-provider.mjs";

const points = Array.from({length:478},(_,i)=>({x:(i%20)/20,y:(i%18)/18,z:0.01}));
const edges = [{start:61,end:146},{start:146,end:91},{start:91,end:181}];
let options;
let closed = false;
const fakeVision = {
  FilesetResolver:{forVisionTasks:async root=>({root})},
  FaceLandmarker:{
    FACE_LANDMARKS_LIPS:edges,
    FACE_LANDMARKS_LEFT_EYE:edges,
    FACE_LANDMARKS_RIGHT_EYE:edges,
    FACE_LANDMARKS_LEFT_EYEBROW:edges,
    FACE_LANDMARKS_RIGHT_EYEBROW:edges,
    FACE_LANDMARKS_FACE_OVAL:edges,
    createFromOptions:async(fileset,opts)=>{
      options={fileset,opts};
      return {detect:source=>{
        assert.equal(source.width,256);
        return {faceLandmarks:[points],faceBlendshapes:[{categories:[{categoryName:"jawOpen",score:0.1}]}],facialTransformationMatrixes:[new Array(16).fill(0)]};
      },close(){closed=true;}};
    }
  }
};
const provider=new NOXMediaPipeFaceLandmarkerProvider({visionLoader:async()=>fakeVision});
const init=await provider.initialize();
assert.equal(init.available,true);
assert.equal(options.opts.runningMode,"IMAGE");
assert.equal(options.opts.numFaces,1);
assert.equal(options.opts.outputFaceBlendshapes,true);
assert.match(options.opts.baseOptions.modelAssetPath,/float16\/latest\/face_landmarker\.task$/);
const result=provider.detect({width:256,height:192});
assert.equal(result.detected,true);
assert.equal(result.landmarks.length,478);
assert.equal(result.connections.lips,edges);
assert.equal(result.blendshapes[0].categoryName,"jawOpen");
assert.equal(provider.detect({width:256,height:192}).detected,true);
assert.throws(()=>provider.detect(null),/Invalid face landmark image/);
await provider.dispose();
assert.equal(closed,true);
assert.equal(provider.state,"idle");
const broken=new NOXMediaPipeFaceLandmarkerProvider({visionLoader:async()=>{throw new Error("offline");}});
const failed=await broken.initialize();
assert.equal(failed.available,false);
assert.equal(failed.state,"unavailable");
console.log("NOX MediaPipe Face Landmarker Provider tests passed");
