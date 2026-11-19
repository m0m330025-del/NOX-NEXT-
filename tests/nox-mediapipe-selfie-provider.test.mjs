import assert from "node:assert/strict";
import {
  NOXMediaPipeSelfieProvider,
  NOX_MEDIAPIPE_SELFIE_MODEL
} from "../core/nox-mediapipe-selfie-provider.mjs";

const width = 16;
const height = 16;
const makeMask = (values) => ({
  width, height,
  getAsFloat32Array: () => values,
  close() { this.closed = true; }
});
const empty = () => new Float32Array(width * height);
const face = empty();
for (let y = 4; y < 12; y += 1) {
  for (let x = 5; x < 11; x += 1) face[y * width + x] = 0.94;
}
const background = empty();
const hair = empty();
const body = empty();
const clothes = empty();
const accessories = empty();

let receivedOptions;
let frameTimestamp = 100;
let masks = [
  makeMask(background), makeMask(hair), makeMask(body),
  makeMask(face), makeMask(clothes), makeMask(accessories)
];
let closedCount = 0;
masks = masks.map(mask => {
  const close = mask.close;
  mask.close = function () { closedCount += 1; close.call(this); };
  return mask;
});

const fakeVision = {
  FilesetResolver: {
    forVisionTasks: async (root) => {
      assert.match(root, /\/wasm$/);
      return { fileset: true };
    }
  },
  ImageSegmenter: {
    createFromOptions: async (fileset, options) => {
      receivedOptions = { fileset, options };
      return {
        segmentForVideo(source, timestamp) {
          assert.equal(source, fakeVideoFrame);
          assert.equal(timestamp, frameTimestamp);
          return { confidenceMasks: masks };
        },
        close() { this.closed = true; }
      };
    }
  }
};
const fakeVideoFrame = { videoFrame: true };
const provider = new NOXMediaPipeSelfieProvider({
  visionLoader: async () => fakeVision,
  minPixels: 12
});

const initialized = await provider.initialize();
assert.equal(initialized.available, true);
assert.equal(initialized.provider, "MediaPipe ImageSegmenter");
assert.equal(receivedOptions.options.runningMode, "VIDEO");
assert.equal(receivedOptions.options.outputConfidenceMasks, true);
assert.equal(receivedOptions.options.baseOptions.delegate, "CPU");
assert.match(receivedOptions.options.baseOptions.modelAssetPath, /selfie_multiclass_256x256\.tflite$/);

const output = provider.segment({
  source: fakeVideoFrame, width, height, frameId: "frame-1", timestamp: frameTimestamp
});
assert.equal(output.frameId, "frame-1");
assert.equal(output.width, width);
assert.equal(output.height, height);
assert.equal(output.source, "mediapipe-selfie-multiclass-face-skin");
assert.equal(output.skin.className, "face-skin");
assert.ok(output.skin.confidence >= 0.9);
assert.equal(output.regions.lips, undefined, "the model does not provide lip masks");
assert.equal(output.regions.eyelids, undefined, "the model does not provide eyelid masks");
assert.equal(output.skin.data.reduce((sum, value) => sum + (value > 0 ? 1 : 0), 0), 48);
assert.equal(closedCount, 6, "all MediaPipe masks must be released after copying");

assert.throws(() => provider.segment({
  source: fakeVideoFrame, width, height, frameId: "frame-2", timestamp: frameTimestamp
}), /Invalid or oversized/, "video timestamps must increase monotonically");
assert.throws(() => provider.segment({
  source: fakeVideoFrame, width: 640, height: 480, frameId: "large", timestamp: 101
}), /Invalid or oversized/, "large source frames must be downscaled before inference");

await provider.dispose();
assert.equal(provider.state, "idle");

const unavailable = new NOXMediaPipeSelfieProvider({
  visionLoader: async () => { throw new Error("CDN unavailable"); }
});
const failed = await unavailable.initialize();
assert.equal(failed.available, false);
assert.equal(failed.reason, "mediapipe-model-load-failed");
assert.equal(unavailable.state, "unavailable");

assert.equal(NOX_MEDIAPIPE_SELFIE_MODEL.classIndex, 3);
assert.equal(NOX_MEDIAPIPE_SELFIE_MODEL.fineFacialRegionsAvailable, false);
console.log("NOX MediaPipe Selfie Provider tests passed");
