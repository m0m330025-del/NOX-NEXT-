import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const camera = readFileSync(new URL("../core/camera.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../camera.css", import.meta.url), "utf8");

for (const cue of ["boot", "shutter", "record-on", "record-off", "lens", "flip"]) {
  assert.match(camera, new RegExp('kind === "' + cue + '"'), "missing NOX camera sound cue: " + cue);
}
assert.match(camera, /showNOXCameraBoot\(\)/, "camera boot splash must be implemented");
assert.match(camera, /event\.detail\?\.to === "camera"/, "boot splash must run when navigating to camera");
assert.match(camera, /تفعيل أو كتم أصوات الكاميرا/, "sound toggle must be accessible");
assert.match(camera, /document\.addEventListener\("click",[\s\S]*?, true\)/, "audio must unlock from a user navigation gesture");
assert.match(styles, /\.nox-camera-boot\s*\{/, "boot splash styling is missing");
assert.match(styles, /prefers-reduced-motion/, "boot animation must respect reduced-motion preference");

console.log("NOX camera sound and boot UI contracts passed.");
