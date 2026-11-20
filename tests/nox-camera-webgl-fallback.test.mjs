import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../core/camera.js", import.meta.url), "utf8");
assert.match(source, /addEventListener\("webglcontextlost"/, "WebGL canvas must observe context loss");
assert.match(source, /event\.preventDefault\(\)/, "context loss handler must allow browser restoration");
assert.match(source, /renderer\?\.canvas === glCanvas/, "only the renderer that owns the lost canvas may be invalidated");
assert.match(source, /renderMode = "Canvas 2D احتياطي"/, "context loss must switch diagnostics to the 2D fallback");
assert.match(source, /gl\.isContextLost\(\)/, "render loop must detect a lost context before drawing");
assert.match(source, /if \(!renderer\) \{[\s\S]*?getContext\("2d"\)/, "render loop must reach the Canvas 2D path when WebGL is unavailable");
assert.match(source, /function releaseRenderer\(target = renderer\)/, "renderer resources must have an explicit teardown path");
assert.match(source, /gl\.deleteTexture\(target\.texture\)/, "teardown must release the WebGL texture");
assert.match(source, /gl\.deleteBuffer\(target\.buffer\)/, "teardown must release the WebGL buffer");
assert.match(source, /gl\.deleteProgram\(target\.program\)/, "teardown must release the WebGL program");
assert.match(source, /WEBGL_lose_context[\s\S]*?loseContext\(\)/, "page teardown must release the WebGL context");
assert.match(source, /pagehide[\s\S]*?releaseRenderer\(\)/, "pagehide must release renderer resources");
console.log("NOX WebGL context-loss fallback contract tests passed");
