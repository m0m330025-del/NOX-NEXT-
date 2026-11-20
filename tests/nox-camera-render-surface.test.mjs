import assert from "node:assert/strict";
import { ensureNOXCanvasSize } from "../core/nox-camera-render-surface.js";

function makeCanvas(width, height) {
  let currentWidth = width;
  let currentHeight = height;
  let writes = 0;
  return {
    get width() { return currentWidth; },
    set width(value) { writes += 1; currentWidth = value; },
    get height() { return currentHeight; },
    set height(value) { writes += 1; currentHeight = value; },
    get writes() { return writes; }
  };
}

const canvas = makeCanvas(640, 480);
assert.equal(ensureNOXCanvasSize(canvas, 640, 480), false);
assert.equal(canvas.writes, 0, "unchanged dimensions must not clear the backing store");

assert.equal(ensureNOXCanvasSize(canvas, 1280, 720), true);
assert.equal(canvas.width, 1280);
assert.equal(canvas.height, 720);
assert.equal(canvas.writes, 2, "a resize updates both dimensions exactly once");

assert.equal(ensureNOXCanvasSize(canvas, 1280, 720), false);
assert.equal(canvas.writes, 2, "repeated dimensions must not cause more writes");

assert.equal(ensureNOXCanvasSize(canvas, 0, 720), false);
assert.equal(ensureNOXCanvasSize(canvas, 1280.5, 720), false);
assert.equal(ensureNOXCanvasSize(null, 1280, 720), false);
assert.equal(canvas.writes, 2, "invalid input must leave the canvas untouched");

console.log("NOX camera render surface resize contract passed");
