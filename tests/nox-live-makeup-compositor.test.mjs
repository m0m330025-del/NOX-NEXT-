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
        rotate: (...args) => canvas.transforms.push(["rotate", ...args]),
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
const vision = { frame: { width: 2, height: 2, id: "test-frame", timestamp: 100, coordinateSpace: "source-unmirrored-normalized" }, faceBox: { x: 0.4, y: 0.3, width: 0.2, height: 0.4 }, regionMasks: {
  lips: { width: 2, height: 2, data, confidence: 0.95, source: "test" }
} };
assert.equal(compositor.accept({ sequence: 1, capturedAt: 100, vision, look: { lips: { color: [200, 20, 60], opacity: 0.5 } } }), true);
assert.equal(compositor.width, 2);
assert.equal(compositor.frame.id, "test-frame");
assert.equal(compositor.frame.coordinateSpace, "source-unmirrored-normalized");
assert.equal(compositor.edgeSoftness, 0.35);
assert.equal(compositor.height, 2);
assert.deepEqual(Array.from(compositor.canvas.image.data), [
  0,0,0,0, 200,20,60,98, 200,20,60,49, 0,0,0,0
]);
const missingFrameIdentity = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas });
const unidentifiedVision = structuredClone(vision);
delete unidentifiedVision.frame.id;
assert.equal(missingFrameIdentity.accept({ sequence: 1, capturedAt: 100, vision: unidentifiedVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), false,
  "masks without exact source-frame identity must be rejected");
assert.equal(missingFrameIdentity.sequence, 0);
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
const alignmentVision = { frame: { width: 2, height: 2, id: "test-frame", timestamp: 100, coordinateSpace: "source-unmirrored-normalized" }, faceBox: { x: 0.4, y: 0.3, width: 0.2, height: 0.4 },
  regionMasks: { lips: { width: 2, height: 2, data: new Float32Array([0,1,0.5,0]), confidence: 0.95 } } };
assert.equal(aligned.accept({ sequence: 1, capturedAt: 600, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
const shiftedTarget = makeCanvas();
shiftedTarget.width = 1000; shiftedTarget.height = 800;
assert.equal(aligned.draw(shiftedTarget, { now: 650,
  currentFaceBox: { x: 0.42, y: 0.31, width: 0.22, height: 0.44 } }), true,
  "small translation and scale changes should be compensated");
assert.deepEqual(shiftedTarget.transforms[1], ["translate", 530, 424]);
assert.ok(Math.abs(shiftedTarget.transforms[2][1] - 1.1) < 1e-9 && Math.abs(shiftedTarget.transforms[2][2] - 1.1) < 1e-9, "bounded scale compensation should use the expected ratio");
assert.equal(aligned.accept({ sequence: 2, capturedAt: 700, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
assert.equal(aligned.draw(shiftedTarget, { now: 710,
  currentFaceBox: { x: 0.35, y: 0.3, width: 0.3, height: 0.6 } }), false,
  "large face scale changes must invalidate stale masks");
assert.equal(aligned.canvas, null);
const rollAware = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas, maxRollAgeMs: 220 });
const rollVision = { ...alignmentVision, frame: { ...alignmentVision.frame, id: "roll-mask", capturedAtMonotonicMs: 1000 } };
const capturedRoll = { state: "estimated", angleRadians: 0.1, frame: { id: "roll-mask", timestamp: 100, capturedAtMonotonicMs: 1000, width: 2, height: 2, coordinateSpace: "source-unmirrored-normalized" } };
assert.equal(rollAware.accept({ sequence: 1, capturedAt: 1000, vision: rollVision, capturedRoll, look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
const rollTarget = makeCanvas(); rollTarget.width = 1000; rollTarget.height = 800;
const currentRoll = { state: "estimated", angleRadians: 0.2, frame: { id: "roll-current", capturedAtMonotonicMs: 1050, width: 256, height: 256, coordinateSpace: "source-unmirrored-normalized" } };
assert.equal(rollAware.draw(rollTarget, { now: 1060, nowMonotonicMs: 1060, mirrored: true, currentFaceBox: alignmentVision.faceBox, currentRoll }), true);
const rotateIndex = rollTarget.transforms.findIndex(item => Array.isArray(item) && item[0] === "rotate");
assert.ok(rotateIndex > 0, "fresh compatible roll should add a rotation transform");
assert.ok(Math.abs(rollTarget.transforms[rotateIndex][1] - 0.1) < 1e-9, "rotation must use current minus captured roll");
assert.ok(rollTarget.transforms[1][0] === "translate" && rollTarget.transforms[2][0] === "scale", "mirror transform must be applied exactly once before alignment/rotation");
const staleTarget = makeCanvas(); staleTarget.width = 1000; staleTarget.height = 800;
const staleCurrentRoll = { ...currentRoll, frame: { ...currentRoll.frame, capturedAtMonotonicMs: 700 } };
assert.equal(rollAware.draw(staleTarget, { now: 1060, nowMonotonicMs: 1060, mirrored: false, currentFaceBox: alignmentVision.faceBox, currentRoll: staleCurrentRoll }), true, "stale roll should not disable otherwise valid makeup overlay");
assert.equal(staleTarget.transforms.some(item => Array.isArray(item) && item[0] === "rotate"), false, "stale roll must skip rotation compensation");
const wrongProvenance = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas });
const mismatchedCapturedRoll = { ...capturedRoll, frame: { ...capturedRoll.frame, timestamp: 101 } };
assert.equal(wrongProvenance.accept({ sequence: 1, capturedAt: 1000, vision: rollVision, capturedRoll: mismatchedCapturedRoll, look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
assert.equal(wrongProvenance.capturedRoll, null, "captured roll with mismatched timestamp must not be stored");
const nonMirroredTarget = makeCanvas(); nonMirroredTarget.width = 1000; nonMirroredTarget.height = 800;
const nonMirrored = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas });
assert.equal(nonMirrored.accept({ sequence: 1, capturedAt: 1000, vision: rollVision, capturedRoll, look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
assert.equal(nonMirrored.draw(nonMirroredTarget, { now: 1060, nowMonotonicMs: 1060, mirrored: false, currentFaceBox: alignmentVision.faceBox, currentRoll }), true);
assert.equal(nonMirroredTarget.transforms.some(item => Array.isArray(item) && item[0] === "rotate"), true, "non-mirrored source should receive the same source-space roll delta");
assert.equal(nonMirroredTarget.transforms.some(item => Array.isArray(item) && item[0] === "scale" && item[1] === -1), false, "non-mirrored output must not receive a mirror transform");
assert.equal(aligned.accept({ sequence: 3, capturedAt: 800, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.5 } } }), true);
assert.equal(aligned.draw(shiftedTarget, { now: 810,
  currentFaceBox: { x: 0.4, y: 0.3, width: 0, height: 0.4 } }), false,
  "invalid face geometry must never be used for alignment");
assert.equal(aligned.canvas, null);
const crisp = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas, edgeSoftness: 0.5 });
const crispMask = { frame: { width: 3, height: 3, id: "crisp-frame", timestamp: 500, coordinateSpace: "source-unmirrored-normalized" }, faceBox: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 }, regionMasks: {
  lips: { width: 3, height: 3, data: new Float32Array([0,0,0,0,1,0,0,0,0]), confidence: 0.99 }
} };
assert.equal(crisp.accept({ sequence: 1, capturedAt: 500, vision: crispMask,
  look: { lips: { color: [100, 50, 25], opacity: 0.5 } } }), true);
const edgeAlpha = crisp.canvas.image.data[(1 * 3 + 1) * 4 + 3];
assert.equal(edgeAlpha, 64, "isolated boundary pixel must be softened");
assert.equal(crisp.canvas.image.data[3], 0, "feathering must never create alpha outside the mask");

const unanchored = new NOXLiveMakeupCompositor({ canvasFactory: makeCanvas });
assert.equal(unanchored.accept({ sequence: 1, capturedAt: 900,
  vision: { frame: { width: 2, height: 2, id: "test-frame", timestamp: 100, coordinateSpace: "source-unmirrored-normalized" }, regionMasks: {
    lips: { width: 2, height: 2, data: new Float32Array([0,1,0,0]), confidence: 0.95 }
  } }, look: { lips: { color: [200,20,60], opacity: 0.4 } } }), false,
  "semantic masks without a trusted faceBox must be rejected at acceptance");
assert.equal(unanchored.canvas, null, "unanchored overlays must never be stored");
assert.equal(unanchored.sequence, 0, "rejected unanchored masks must not advance the sequence");
assert.equal(unanchored.accept({ sequence: 1, capturedAt: 920,
  vision: { ...alignmentVision, faceBox: { x: -0.1, y: 0.3, width: 0.2, height: 0.4 } },
  look: { lips: { color: [200,20,60], opacity: 0.4 } } }), false,
  "face anchors outside normalized frame bounds must be rejected");
assert.equal(unanchored.accept({ sequence: 1, capturedAt: 930, vision: alignmentVision,
  look: { lips: { color: [200,20,60], opacity: 0.4 } } }), true);
assert.throws(() => new NOXLiveMakeupCompositor({ edgeSoftness: 0.9 }), /invalid-live-makeup-compositor-options/);
console.log("NOX Live Makeup Compositor tests passed");
