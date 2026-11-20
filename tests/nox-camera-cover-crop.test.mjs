import assert from "node:assert/strict";
import { getNOXCoverCrop } from "../core/nox-camera-cover-crop.mjs";

const landscape = getNOXCoverCrop(1600, 900, 450, 800);
assert.equal(landscape.sy, 0);
assert.equal(landscape.sh, 900);
assert.ok(Math.abs(landscape.sw / landscape.sh - 9 / 16) < 1e-9);
assert.ok(Math.abs(landscape.sx - (1600 - 506.25) / 2) < 1e-9);
assert.equal(landscape.outputHeight, 900);

const portrait = getNOXCoverCrop(900, 1600, 450, 800);
assert.equal(portrait.sx, 0);
assert.equal(portrait.sy, 0);
assert.equal(portrait.sw, 900);
assert.equal(portrait.sh, 1600);

const fourThree = getNOXCoverCrop(1200, 900, 450, 800);
assert.equal(fourThree.sy, 0);
assert.ok(Math.abs(fourThree.sw / fourThree.sh - 9 / 16) < 1e-9);
assert.throws(() => getNOXCoverCrop(0, 900, 450, 800), /invalid-camera-cover-dimensions/);

const camera = await (await import("node:fs/promises")).readFile(new URL("../core/camera.js", import.meta.url), "utf8");
assert.match(camera, /getNOXCoverCrop\(renderCanvas\.width,\s*renderCanvas\.height,\s*targetWidth,\s*targetHeight\)/);
assert.match(camera, /crop\.sx,\s*crop\.sy,\s*crop\.sw,\s*crop\.sh/);
console.log("NOX camera preview and export crop tests passed");
