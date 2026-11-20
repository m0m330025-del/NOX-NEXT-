import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../core/camera.js", import.meta.url), "utf8");
assert.match(source, /addEventListener\("webglcontextlost"/, "WebGL canvas must observe context loss");
assert.match(source, /event\.preventDefault\(\)/, "context loss handler must allow browser restoration");
assert.match(source, /renderer\?\.canvas === glCanvas/, "only the renderer that owns the lost canvas may be invalidated");
assert.match(source, /renderMode = "Canvas 2D احتياطي"/, "context loss must switch diagnostics to the 2D fallback");
assert.match(source, /gl\.isContextLost\(\)/, "render loop must detect a lost context before drawing");
assert.match(source, /if \(!renderer\) \{[\s\S]*?getContext\("2d"\)/, "render loop must reach the Canvas 2D path when WebGL is unavailable");
console.log("NOX WebGL context-loss fallback contract tests passed");
