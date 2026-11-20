import assert from "node:assert/strict";
import { NOX_HYBRID_FILTERS, NOX_HYBRID_FILTER_COUNT, getNOXHybridFilter, listNOXHybridFilters } from "../core/nox-hybrid-fx-engine.js";

assert.equal(NOX_HYBRID_FILTER_COUNT, 6);
assert.equal(listNOXHybridFilters().length, 6);
assert.equal(new Set(NOX_HYBRID_FILTERS.map((item) => item.id)).size, 6);
assert.equal(new Set(NOX_HYBRID_FILTERS.map((item) => item.blend)).size, 6,
  "each hybrid must use a distinct composition operator");
for (const filter of NOX_HYBRID_FILTERS) {
  assert.ok(filter.engines.length >= 3, filter.id + " must combine at least three engines");
  assert.ok(filter.engines.every((engine) => typeof engine === "string" && engine.length > 3));
  assert.ok(filter.shaderMode >= 1 && filter.shaderMode <= 6);
  assert.ok(filter.mix >= 0.08 && filter.mix <= 0.72);
}
assert.equal(getNOXHybridFilter("chroma-tide").engines.length, 3);
assert.equal(getNOXHybridFilter("not-real"), null);
console.log("NOX hybrid FX engine tests passed");
