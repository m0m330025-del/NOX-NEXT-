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

import { buildNOXHybridSelection } from "../core/nox-hybrid-fx-engine.js";
const combined = buildNOXHybridSelection(["chroma-tide", "quantum-bloom", "aurora-relic"], [0.25, 0.5, 0.35, 0.4, 0.2, 0.7]);
assert.equal(combined.mask, 37);
assert.equal(combined.count, 3);
assert.deepEqual(combined.weights, [0.25, 0.5, 0.35, 0.4, 0.2, 0.7]);
const bounded = buildNOXHybridSelection(["prism-forge"], [NaN, 9, -1, 0, 0, 0]);
assert.equal(bounded.mask, 2);
assert.equal(bounded.weights[0], NOX_HYBRID_FILTERS[0].mix);
assert.equal(bounded.weights[1], 0.85);
assert.equal(bounded.weights[2], 0);
