import assert from "node:assert/strict";
import { NOXBiSeNetFaceParsingProvider } from "../core/nox-bisenet-face-parsing-provider.mjs";

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
await provider.dispose();
assert.equal(provider.state, "idle");
const missing = new NOXBiSeNetFaceParsingProvider({ modelUrl: "", modelInputSize: size });
assert.equal((await missing.initialize()).reason, "model-url-not-configured");
console.log("NOX BiSeNet Face Parsing Provider tests passed");
