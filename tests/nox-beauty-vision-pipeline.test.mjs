import assert from "node:assert/strict";
import { NOXBeautyVisionPipeline } from "../core/nox-beauty-vision-pipeline.mjs";
import { NOXBeautyVisionProvider } from "../core/nox-beauty-vision-provider.mjs";
import { NOXSkinSegmentationEngine } from "../core/nox-skin-segmentation-engine.mjs";
import { NOXMakeupRenderingEngine } from "../core/nox-makeup-rendering-engine.mjs";

const now = 5_000;
const width = 10;
const height = 10;
const length = width * height;
const data = new Float32Array(length);
for (let y = 2; y < 8; y += 1) {
  for (let x = 2; x < 8; x += 1) data[y * width + x] = 0.95;
}
const frame = { source: {}, width, height, frameId: "frame-5", timestamp: now };
const imageData = new Uint8ClampedArray(length * 4);
for (let i = 0; i < length; i += 1) {
  imageData[i * 4] = 100;
  imageData[i * 4 + 1] = 120;
  imageData[i * 4 + 2] = 140;
  imageData[i * 4 + 3] = 255;
}
const image = { width, height, data: imageData };
const faceBox = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const provider = {
  initialize: async () => ({ available: true }),
  segment: async () => ({
    width, height, frameId: "frame-5", timestamp: now,
    source: "pipeline-test-provider", faceBox,
    skin: { data, confidence: 0.95 },
    regions: {
      lips: { data, confidence: 0.96 }
    }
  })
};
const adapter = new NOXBeautyVisionProvider({ provider, now: () => now });
const skin = new NOXSkinSegmentationEngine({ minPixels: 3, minCoverage: 0.05 });
const makeup = new NOXMakeupRenderingEngine({ minConfidence: 0.8 });
const pipeline = new NOXBeautyVisionPipeline({
  providerAdapter: adapter, skinEngine: skin, makeupEngine: makeup
});

assert.equal((await pipeline.initialize()).state, "ready");
const result = await pipeline.process({
  frame, image, looks: { lips: { color: [220, 30, 70], opacity: 0.5 } }
});
assert.equal(result.state, "processed");
assert.equal(result.skin.state, "accepted");
assert.equal(result.makeup.state, "rendered");
assert.equal(result.makeup.changedPixels, 36);
assert.notDeepEqual(Array.from(result.outputImage.data), Array.from(image.data));
assert.deepEqual(Array.from(image.data), Array.from(imageData),
  "pipeline must not mutate the original frame");

// Missing requested semantic regions fail closed at the compositor.
const missingRegionProvider = new NOXBeautyVisionProvider({
  provider: { initialize: async () => ({available:true}), segment: async () => ({
    width, height, frameId:"frame-5", timestamp:now, source:"provider",
    faceBox, skin:{data,confidence:0.95}, regions:{}
  })},
  now: () => now
});
const pipeline2 = new NOXBeautyVisionPipeline({
  providerAdapter: missingRegionProvider,
  skinEngine: new NOXSkinSegmentationEngine({minPixels:3,minCoverage:0.05}),
  makeupEngine: new NOXMakeupRenderingEngine()
});
await pipeline2.initialize();
const missing = await pipeline2.process({
  frame, image, looks: { lips: { color: [220,30,70], opacity: 0.4 } }
});
assert.equal(missing.state, "processed");
assert.equal(missing.makeup.reason, "missing-or-mismatched-region-mask");
assert.deepEqual(missing.outputImage.data, image.data);

// Invalid frame pairing never reaches provider.
assert.equal((await pipeline.process({
  frame, image: { ...image, width: 9 }, looks: {}
})).reason, "image-frame-mismatch");

await pipeline.reset();
assert.equal(pipeline.state, "idle");
console.log("NOX Beauty Vision Pipeline tests passed");
