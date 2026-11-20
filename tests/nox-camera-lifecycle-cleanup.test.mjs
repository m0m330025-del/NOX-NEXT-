import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../core/camera.js", import.meta.url), "utf8");

const startFailure = source.slice(
  source.indexOf("async function startCamera()"),
  source.indexOf("async function switchCamera()")
);
assert.match(startFailure, /stopTracks\(stream\);\s*stream = null;/);
assert.match(startFailure, /video\.pause\(\);\s*video\.srcObject = null;/,
  "failed camera startup must detach the stopped stream");
assert.match(startFailure, /if \(animationFrame\) cancelAnimationFrame\(animationFrame\);\s*animationFrame = 0;/,
  "failed camera startup must cancel any pending render loop");

const recorderError = source.slice(
  source.indexOf("recorder.onerror"),
  source.indexOf("recorder.onstop")
);
assert.match(recorderError, /recording = false;/);
assert.match(recorderError, /chunks = \[\];/,
  "failed recording must discard incomplete chunks");
assert.match(recorderError, /stopTracks\(recordingStream\);\s*recordingStream = null;/,
  "recording failure must release its canvas capture tracks");
assert.match(recorderError, /recordButton\.textContent = "فيديو"/,
  "record button must return to its idle state after an error");

console.log("Camera startup and recording failure cleanup contracts verified");
