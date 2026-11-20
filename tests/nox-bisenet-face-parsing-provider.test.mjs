import assert from "node:assert/strict";
import { NOXBiSeNetFaceParsingProvider } from "../core/nox-bisenet-face-parsing-provider.mjs";
import { NOXBeautyVisionProvider } from "../core/nox-beauty-vision-provider.mjs";
import { NOXMakeupRenderingEngine } from "../core/nox-makeup-rendering-engine.mjs";

const size = 4;
const pixels = size * size;
const logits = new Float32Array(19 * pixels);
for (let i = 0; i < pixels; i += 1) {
  for (let c = 0; c < 19; c += 1) logits[c * pixels + i] = -6;
  logits[1 * pixels + i] = 4;
}
for (const i of [5, 7]) { logits[1 * pixels + i] = -6; logits[2 * pixels + i] = 5; }
for (const i of [6, 8]) { logits[1 * pixels + i] = -6; logits[12 * pixels + i] = 5; }
const session = {
  inputNames: ["input"], outputNames: ["output"],
  run: async () => ({ output: { data: logits, dims: [1, 19, size, size] } }),
  release: async () => {}
};
const provider = new NOXBiSeNetFaceParsingProvider({
  modelInputSize: size,
  sessionFactory: async () => ({ session }),
  preprocessFrame: async () => new Float32Array(3 * pixels),
  maxInputDimension: 64
});
assert.equal((await provider.initialize()).available, true);
const result = await provider.segment({ source: {}, width: size, height: size, frameId: "f1", timestamp: 100 });
assert.equal(result.source, "yakhyo-bisenet-resnet18-onnx-19class");
assert.equal(result.width, size);
assert.ok(result.faceBox.width > 0);
assert.ok(result.skin.data instanceof Float32Array);
assert.ok(result.regions.brows.data instanceof Float32Array);
assert.ok(result.regions.lips.data instanceof Float32Array);
assert.deepEqual(result.unavailableRegions, ["eyelids", "cheeks"]);
assert.ok(result.regions.lips.confidence > 0.9);

// Verify the real parsing output passes through the shared vision adapter and
// produces a makeup render only on semantic lip pixels.
const adapter = new NOXBeautyVisionProvider({
  provider,
  minSkinConfidence: 0.8,
  minRegionConfidence: 0.8,
  now: () => 100
});
assert.equal((await adapter.initialize()).available, true);
const vision = await adapter.processFrame({
  source: {},
  width: size,
  height: size,
  frameId: "frame-adapter",
  timestamp: 100
});
assert.equal(vision.state, "partial");
assert.ok(vision.regionMasks.lips);
assert.ok(vision.regionMasks.brows);
const sourcePixels = new Uint8ClampedArray(pixels * 4);
for (let i = 0; i < pixels; i += 1) {
  sourcePixels[i * 4] = 120;
  sourcePixels[i * 4 + 1] = 130;
  sourcePixels[i * 4 + 2] = 140;
  sourcePixels[i * 4 + 3] = 255;
}
const makeupEngine = new NOXMakeupRenderingEngine({ minConfidence: 0.8 });
const rendered = makeupEngine.render(
  { width: size, height: size, data: sourcePixels },
  vision.regionMasks,
  { lips: { color: [198, 48, 88], opacity: 0.34 } }
);
assert.equal(rendered.state, "rendered");
assert.equal(rendered.changedPixels, 2);
assert.deepEqual(Array.from(sourcePixels.slice(6 * 4, 6 * 4 + 3)), [120, 130, 140]);

await adapter.reset();
assert.equal(provider.state, "idle");
const missing = new NOXBiSeNetFaceParsingProvider({ modelUrl: "", modelInputSize: size });
assert.equal((await missing.initialize()).reason, "model-url-not-configured");
console.log("NOX BiSeNet Face Parsing Provider tests passed");
