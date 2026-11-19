import assert from "node:assert/strict";
import { NOXMakeupRenderingEngine } from "../core/nox-makeup-rendering-engine.mjs";

const engine = new NOXMakeupRenderingEngine({ minConfidence: 0.8, maxOpacity: 0.7 });
const width = 4;
const height = 4;
const sourcePixels = new Uint8ClampedArray(width * height * 4);
for (let i = 0; i < width * height; i += 1) {
  sourcePixels[i * 4] = 100;
  sourcePixels[i * 4 + 1] = 120;
  sourcePixels[i * 4 + 2] = 140;
  sourcePixels[i * 4 + 3] = 255;
}
const image = { width, height, data: sourcePixels };
const lips = new Float32Array(width * height);
lips[5] = 1;
lips[6] = 0.5;
const masks = {
  lips: { width, height, data: lips, confidence: 0.95, source: "test-semantic-provider" }
};
const rendered = engine.render(image, masks, {
  lips: { color: [220, 30, 70], opacity: 0.5 }
});
assert.equal(rendered.state, "rendered");
assert.equal(rendered.changedPixels, 2);
assert.notDeepEqual(
  Array.from(rendered.image.data.slice(5 * 4, 5 * 4 + 3)),
  Array.from(sourcePixels.slice(5 * 4, 5 * 4 + 3))
);
assert.deepEqual(
  Array.from(rendered.image.data.slice(0, 3)),
  Array.from(sourcePixels.slice(0, 3)),
  "pixels outside the semantic mask must remain unchanged"
);
assert.deepEqual(Array.from(sourcePixels.slice(5 * 4, 5 * 4 + 3)), [100, 120, 140],
  "source image must not be mutated");

assert.equal(engine.render(image, {}, {
  lips: { color: [220, 30, 70], opacity: 0.5 }
}).reason, "missing-or-mismatched-region-mask");
assert.equal(engine.render(image, {
  lips: { ...masks.lips, confidence: 0.4 }
}, { lips: { color: [220, 30, 70], opacity: 0.5 } }).reason, "low-region-confidence");
assert.equal(engine.render(image, {
  lips: { ...masks.lips, data: new Float32Array([2, ...new Array(15).fill(0)]) }
}, { lips: { color: [220, 30, 70], opacity: 0.5 } }).reason, "invalid-region-mask-value");
assert.equal(engine.render(image, masks, {
  lips: { color: [220, 30, 70], opacity: 0.95 }
}).reason, "invalid-makeup-look");
assert.equal(engine.render(image, masks, {
  face: { color: [220, 30, 70], opacity: 0.4 }
}).reason, "unsupported-region");

engine.reset();
console.log("NOX Makeup Rendering Engine tests passed");
