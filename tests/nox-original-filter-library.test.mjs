import assert from "node:assert/strict";
import {
  NOX_FILTER_COUNT,
  listNOXFilters,
  getNOXFilter,
  applyNOXFilter
} from "../core/nox-original-filter-library.js";

const catalog = listNOXFilters();
assert.equal(NOX_FILTER_COUNT, 1000);
assert.equal(catalog.length, 1000);
assert.equal(new Set(catalog.map(filter => filter.id)).size, 1000,
  "every generated filter must have a unique ID");

for (const family of [
  "SPECTRAL", "THERMAL", "AURORA", "CHROMATIC", "DREAM",
  "CONTOUR", "HALFTONE", "SOLAR", "NOCTURNE", "PRISMATIC"
]) {
  const entries = listNOXFilters({ family });
  assert.equal(entries.length, 100, family + " must contain exactly 100 variants");
  assert.equal(new Set(entries.map(entry => JSON.stringify({
    intensity: entry.intensity, contrast: entry.contrast, saturation: entry.saturation,
    grain: entry.grain, phase: entry.phase, scale: entry.scale, warp: entry.warp, glow: entry.glow
  }))).size, 100, family + " variants must have distinct parameter recipes");
}

assert.equal(getNOXFilter("nox-0001").family, "SPECTRAL");
assert.equal(getNOXFilter("nox-1000").family, "PRISMATIC");
assert.equal(getNOXFilter("unknown-filter"), null);
assert.throws(() => applyNOXFilter({ data: new Uint8ClampedArray(4), width: 1, height: 1 }, "unknown-filter"));

const makeFrame = () => {
  const data = new Uint8ClampedArray(16 * 12 * 4);
  for (let y = 0; y < 12; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const i = (y * 16 + x) * 4;
      data[i] = (x * 17 + y * 5) % 256;
      data[i + 1] = (x * 7 + y * 19) % 256;
      data[i + 2] = (x * 13 + y * 11) % 256;
      data[i + 3] = 255;
    }
  }
  return { data, width: 16, height: 12 };
};

for (const filter of catalog) {
  const frame = makeFrame();
  const output = applyNOXFilter(frame, filter.id, 1.25);
  assert.equal(output, frame, "filter should mutate and return the supplied ImageData");
  assert.ok(output.data.every(Number.isFinite), filter.id + " must not produce non-finite channels");
}
const auroraA = makeFrame();
const auroraB = makeFrame();
applyNOXFilter(auroraA, "nox-0201", 0);
applyNOXFilter(auroraB, "nox-0201", 2.5);
assert.notDeepEqual([...auroraA.data], [...auroraB.data],
  "animated procedural families must respond to the supplied time");
assert.throws(() => applyNOXFilter({ data: new Uint8ClampedArray(4), width: 0, height: 1 }, "nox-0001"),
  /Canvas ImageData/);

console.log("NOX original 1,000-filter library tests passed");
