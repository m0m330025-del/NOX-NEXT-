import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const camera = await readFile(new URL("../core/camera.js", import.meta.url), "utf8");
const fusion = await readFile(new URL("../core/nox-multi-model-face-fusion-provider.js", import.meta.url), "utf8");
const provider = await readFile(new URL("../core/nox-mediapipe-face-landmarker-provider.js", import.meta.url), "utf8");

assert.match(camera, /landmarkProvider:\s*faceLandmarkerProvider/);
assert.match(camera, /ownsLandmarkProvider:\s*false/);
assert.match(camera, /beautyVisionProvider\?\.landmarkProvider\s*===\s*faceLandmarkerProvider/);
assert.match(camera, /if\s*\(!faceLandmarksLiveEnabled\s*&&\s*faceLandmarkerProvider\)/);
assert.match(fusion, /ownsLandmarkProvider\s*=\s*true/);
assert.match(fusion, /if\s*\(this\.ownsLandmarkProvider\)\s*cleanup\.push\(this\.landmarkProvider\.dispose\?\.\(\)\)/);
assert.match(provider, /if\s*\(this\.initializePromise\)\s*return\s*this\.initializePromise/);
assert.match(provider, /generation\s*!==\s*this\.lifecycleGeneration/);
console.log("NOX camera MediaPipe sharing contract tests passed");
