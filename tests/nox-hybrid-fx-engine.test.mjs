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

import { createNOXChaosRecipe, validateNOXChaosRecipe, NOX_CHAOS_MODES } from "../core/nox-hybrid-fx-engine.js";
assert.equal(NOX_CHAOS_MODES.length, 4);
const recipe = createNOXChaosRecipe("My Fusion", ["chroma-tide", "aurora-relic"], [0.2,0.3,0.4,0.5,0.6,0.7], "phase-collision");
assert.deepEqual(recipe.ids, ["chroma-tide", "aurora-relic"]);
assert.equal(recipe.mode, "phase-collision");
assert.equal(validateNOXChaosRecipe(recipe).ids.length, 2);
const deduplicated = validateNOXChaosRecipe({ ...recipe, ids: ["chroma-tide", "chroma-tide", "unknown", "aurora-relic"] });
assert.deepEqual(deduplicated.ids, ["chroma-tide", "aurora-relic"]);
assert.equal(validateNOXChaosRecipe({ ...recipe, ids: ["unknown"] }), null);
assert.equal(validateNOXChaosRecipe({ version: 9 }), null);
assert.throws(() => createNOXChaosRecipe("", ["chroma-tide"], []));


import { getNOXChaosRecipeSignature, scoreNOXChaosRecipe, generateNOXChaosRecipe } from "../core/nox-hybrid-fx-engine.js";
const signatureA = getNOXChaosRecipeSignature(recipe);
const signatureB = getNOXChaosRecipeSignature({ ...recipe, name: "Renamed" });
assert.equal(signatureA, signatureB, "names must not affect canonical recipe identity");
assert.ok(signatureA.length > 10);
assert.equal(getNOXChaosRecipeSignature({ version: 99 }), "");
assert.ok(scoreNOXChaosRecipe(recipe, []) > 0);
assert.ok(scoreNOXChaosRecipe(recipe, [recipe]) < 0.2);
const evolvedA = generateNOXChaosRecipe([recipe], { seed: 12345 });
const evolvedB = generateNOXChaosRecipe([recipe], { seed: 12345 });
assert.ok(evolvedA && evolvedA.ids.length >= 1);
assert.equal(evolvedA.signature, evolvedB.signature, "same seed and history must be deterministic");
assert.notEqual(evolvedA.signature, signatureA, "evolution must avoid known recipes");
assert.ok(evolvedA.score > 0);
console.log("NOX evolutionary recipe tests passed");
