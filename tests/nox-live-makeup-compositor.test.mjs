import assert from "node:assert/strict";
import { NOXLiveMakeupCompositor } from "../core/nox-live-makeup-compositor.mjs";

function makeCanvas() {
  const canvas = { width: 0, height: 0, image: null, draws: [], transforms: [],
    getContext() {
      return {
        createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
        putImageData: image => { canvas.image = image; },
        save: () => canvas.transforms.push("save"),
        restore: () => canvas.transforms.push("restore"),
        translate: (...args) => canvas.transforms.push(["translate", ...args]),
        scale: (...args) => canvas.transforms.push(["scale", ...args]),
        drawImage: (...args) => canvas.draws.push(args)
      };
    }
  };
  return canvas;
}
const created = [];
const compositor = new NOXLiveMakeupCompositor({ canvasFactory: () => { const canvas = makeCanvas(); created.push(canvas); return canvas; }, maxAgeMs: 220 });
const data = new Float32Array([0, 1, 0.5, 0]);
const vision = { frame: { width: 2, height: 2 }, faceBox: { x: 0.4, y: 0.3, width: 0.2, height: 0.4 }, regionMasks: {
  lips: { width: 2, height: 2, data, confidence: 0.95, source: "test" }
} };
assert.equal(compositor.accept({ sequence: 1, capturedAt: 100, vision, look: { lips: { color: [200, 20, 60], opacity: 0.5 } } }), true);
assert.equal(compositor.width, 2);
assert.equal(compositor.edgeSoftness, 0.35);
assert.equal(compositor.height, 2);
assert.deepEqual(Array.from(compositor.canvas.image.data), [
  0,0,0,0, 200,20,60,98, 200,20,60,49, 0,0,0,0
]);
const target = makeCanvas();
target.width = 640; target.height = 480;
assert.equal(compositor.draw(target, { now: 200, mirrored: true, currentFaceBox: { x: 0.4, y: 0.3, width: 0.2, height: 0.4 } }), true);
assert.equal(target.draws.length, 1);
assert.deepEqual(target.transforms[0], "save");
assert.deepEqual(target.transforms[1], ["translate", 640, 0]);
assert.deepEqual(target.transforms[2], ["scale", -1, 1]);
assert.deepEqual(target.transforms[3], ["translate", 320, 240]);
assert.deepEqual(target.transforms[4], ["scale", 1, 1]);
assert.deepEqual(target.transforms[5], ["translate", -320, -240]);
assert.equal(compositor.accept({ sequence: 1, capturedAt: 110, vision, look: { lips: { color: [1,2,3], opacity: 0.2 } } }), false);
assert.equal(compositor.draw(target, { now: 321 }), false);
assert.equal(compositor.canvas, null);
assert.equal(compositor.accept({ sequence: 2, capturedAt: 400, vision, look: { eyelids: { color: [1,2,3], opacity: 0.2 } } }), false);
assert.equal(compositor.accept({ sequence: 2, capturedAt: 400, vision, look: { lips: { color: [200, 20, 60], opacity: 0.5 } } }), true);
assert.equal(compositor.draw(target, { now: 410, currentFaceBox: { x: 0.58, y: 0.3, width: 0.2, height: 0.4 } }), false, "large face-center drift must invalidate the old makeup mask");
assert.equal(compositor.canvas, null);
compositor.clear();
const aligned = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas, maxAgeMs: 220 });
const alignmentVision = { frame: { width: 2, height: 2 }, faceBox: { x: 0.4, y: 0.3, width: 0.2, height: 0.4 },
  regionMasks: { lips: { width: 2, height: 2, data: new Float32Array([0,1,0.5,0]), confidence: 0.95 } } };
assert.equal(aligned.accept({ sequence: 1, capturedAt: 600, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
const shiftedTarget = makeCanvas();
shiftedTarget.width = 1000; shiftedTarget.height = 800;
assert.equal(aligned.draw(shiftedTarget, { now: 650,
  currentFaceBox: { x: 0.42, y: 0.31, width: 0.22, height: 0.44 } }), true,
  "small translation and scale changes should be compensated");
assert.deepEqual(shiftedTarget.transforms[1], ["translate", 530, 424]);
assert.deepEqual(shiftedTarget.transforms[2], ["scale", 1.1, 1.1]);
assert.equal(aligned.accept({ sequence: 2, capturedAt: 700, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
assert.equal(aligned.draw(shiftedTarget, { now: 710,
  currentFaceBox: { x: 0.35, y: 0.3, width: 0.3, height: 0.6 } }), false,
  "large face scale changes must invalidate stale masks");
assert.equal(aligned.canvas, null);
assert.equal(aligned.accept({ sequence: 3, capturedAt: 800, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
assert.equal(aligned.draw(shiftedTarget, { now: 810,
  currentFaceBox: { x: 0.4, y: 0.3, width: 0, height: 0.4 } }), false,
  "invalid face geometry must never be used for alignment");
assert.equal(aligned.canvas, null);
const crisp = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas, edgeSoftness: 0.5 });
const crispMask = { frame: { width: 3, height: 3 }, regionMasks: {
  lips: { width: 3, height: 3, data: new Float32Array([0,0,0,0,1,0,0,0,0]), confidence: 0.99 }
} };
assert.equal(crisp.accept({ sequence: 1, capturedAt: 500, vision: crispMask,
  look: { lips: { color: [100, 50, 25], opacity: 0.5 } } }), true);
const edgeAlpha = crisp.canvas.image.data[(1 * 3 + 1) * 4 + 3];
assert.equal(edgeAlpha, 64, "isolated boundary pixel must be softened");
assert.equal(crisp.canvas.image.data[3], 0, "feathering must never create alpha outside the mask");
assert.throws(() => new NOXLiveMakeupCompositor({ edgeSoftness: 0.9 }), /invalid-live-makeup-compositor-options/);
console.log("NOX Live Makeup Compositor tests passed");
