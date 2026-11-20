/**
 * NOX HYBRID FX ENGINE
 * Composes independent optical-processing ideas through distinct GPU blend operators.
 * The camera shader performs the real-time composition; this module owns validated recipes.
 */
const FILTERS = Object.freeze([
  { id: "chroma-tide", name: "CHROMA TIDE", engines: ["spectral dispersion", "fluid interference", "edge caustics"], blend: "refractive-interference", shaderMode: 1, mix: 0.48, tier: "balanced" },
  { id: "prism-forge", name: "PRISM FORGE", engines: ["radial dispersion", "contour engraving", "spectral light"], blend: "radial-channel-weave", shaderMode: 2, mix: 0.52, tier: "balanced" },
  { id: "quantum-bloom", name: "QUANTUM BLOOM", engines: ["particle lattice", "optical bloom", "phase pulse"], blend: "particle-emission", shaderMode: 3, mix: 0.44, tier: "balanced" },
  { id: "topographic-dream", name: "TOPOGRAPHIC DREAM", engines: ["relief contours", "halftone cells", "chromatic ink"], blend: "contour-halftone", shaderMode: 4, mix: 0.46, tier: "balanced" },
  { id: "echo-matter", name: "ECHO MATTER", engines: ["directional sampling", "temporal phase", "prismatic residue"], blend: "directional-echo", shaderMode: 5, mix: 0.40, tier: "performance" },
  { id: "aurora-relic", name: "AURORA RELIC", engines: ["thin-film interference", "aurora field", "light sculpture"], blend: "field-interference", shaderMode: 6, mix: 0.50, tier: "balanced" }
].map((filter) => Object.freeze({ ...filter, engines: Object.freeze(filter.engines.slice()) })));

const BY_ID = new Map(FILTERS.map((filter) => [filter.id, filter]));

export function listNOXHybridFilters() {
  return FILTERS.slice();
}

export function getNOXHybridFilter(id) {
  return BY_ID.get(String(id)) || null;
}

export const NOX_HYBRID_FILTERS = FILTERS;
export const NOX_HYBRID_FILTER_COUNT = FILTERS.length;

/** Build a bit-mask and bounded per-engine weights for the live shader mixer. */
export function buildNOXHybridSelection(ids = [], weights = []) {
  const selected = new Set(Array.isArray(ids) ? ids.map(String) : []);
  let mask = 0;
  NOX_HYBRID_FILTERS.forEach((filter, index) => {
    if (selected.has(filter.id)) mask += 2 ** index;
  });
  const normalizedWeights = NOX_HYBRID_FILTERS.map((filter, index) => {
    const value = Number(weights[index] ?? filter.mix);
    return Number.isFinite(value) ? Math.max(0, Math.min(0.85, value)) : filter.mix;
  });
  return Object.freeze({ mask, weights: Object.freeze(normalizedWeights), count: NOX_HYBRID_FILTERS.filter((filter) => selected.has(filter.id)).length });
}

export const NOX_CHAOS_MODES = Object.freeze([
  Object.freeze({ id: "resonance", name: "RESONANCE", mode: 1, description: "نبض متزامن مع سطوع الصورة" }),
  Object.freeze({ id: "phase-collision", name: "PHASE COLLISION", mode: 2, description: "تصادم الأطوار وتباين متحرك" }),
  Object.freeze({ id: "chromatic-gravity", name: "CHROMATIC GRAVITY", mode: 3, description: "جذب لوني نحو بؤرة متغيرة" }),
  Object.freeze({ id: "temporal-bloom", name: "TEMPORAL BLOOM", mode: 4, description: "تبادل زمني بين طبقات التوهج" })
]);
export function getNOXChaosMode(id) {
  return NOX_CHAOS_MODES.find((item) => item.id === String(id)) || NOX_CHAOS_MODES[0];
}
export function createNOXChaosRecipe(name, ids = [], weights = [], mode = "resonance") {
  const cleanName = String(name || "").trim().slice(0, 32);
  if (!cleanName) throw new TypeError("Recipe name is required");
  const selection = buildNOXHybridSelection(ids, weights);
  if (!selection.count) throw new TypeError("At least one hybrid layer is required");
  return Object.freeze({
    version: 1, name: cleanName,
    ids: NOX_HYBRID_FILTERS.filter((item, index) => selection.mask & (2 ** index)).map((item) => item.id),
    weights: selection.weights,
    mode: getNOXChaosMode(mode).id
  });
}
export function validateNOXChaosRecipe(value) {
  if (!value || value.version !== 1 || typeof value.name !== "string" ||
      !Array.isArray(value.ids) || !Array.isArray(value.weights) ||
      value.weights.length !== NOX_HYBRID_FILTERS.length) return null;
  const ids = [...new Set(value.ids.map(String).filter((id) => BY_ID.has(id)))];
  if (!ids.length) return null;
  return createNOXChaosRecipe(value.name, ids, value.weights, getNOXChaosMode(value.mode).id);
}


/** Stable canonical key: quantized weights prevent float-noise duplicates. */
export function getNOXChaosRecipeSignature(value) {
  const recipe = validateNOXChaosRecipe(value);
  if (!recipe) return "";
  const active = recipe.ids.slice().sort();
  const weights = recipe.weights.map((weight) => Math.round(weight * 20));
  return [active.join(","), weights.join("."), recipe.mode].join("|");
}

export function scoreNOXChaosRecipe(value, history = []) {
  const recipe = validateNOXChaosRecipe(value);
  if (!recipe) return 0;
  const active = new Set(recipe.ids);
  const validHistory = (Array.isArray(history) ? history : []).map(validateNOXChaosRecipe).filter(Boolean);
  if (!validHistory.length) return 1;
  const distances = validHistory.map((prior) => {
    const other = new Set(prior.ids);
    const union = new Set([...active, ...other]);
    let intersection = 0;
    active.forEach((id) => { if (other.has(id)) intersection += 1; });
    const jaccard = union.size ? 1 - intersection / union.size : 0;
    const weightDistance = recipe.weights.reduce((sum, weight, index) => sum + Math.abs(weight - prior.weights[index]), 0) / NOX_HYBRID_FILTERS.length;
    const modeDistance = recipe.mode === prior.mode ? 0 : 0.18;
    return Math.min(1, jaccard * 0.62 + weightDistance * 0.28 + modeDistance);
  });
  const novelty = Math.min(...distances);
  const balance = 1 - Math.min(1, Math.abs(recipe.ids.length - 3.2) / 3.2);
  return Number((novelty * 0.82 + balance * 0.18).toFixed(4));
}

/** Deterministic evolutionary search over layer sets, weights and coupling modes. */
export function generateNOXChaosRecipe(history = [], options = {}) {
  const prior = (Array.isArray(history) ? history : []).map(validateNOXChaosRecipe).filter(Boolean);
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) >>> 0 : 0x4e4f5801;
  let state = seed || 1;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const seen = new Set(prior.map(getNOXChaosRecipeSignature));
  let best = null;
  let bestScore = -1;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const ids = NOX_HYBRID_FILTERS.filter(() => random() > 0.43).map((item) => item.id);
    if (ids.length < 2) ids.push(NOX_HYBRID_FILTERS[Math.floor(random() * NOX_HYBRID_FILTERS.length)].id);
    const uniqueIds = [...new Set(ids)];
    const weights = NOX_HYBRID_FILTERS.map((filter) => {
      const evolved = filter.mix + (random() - 0.5) * 0.58;
      return Math.max(0.08, Math.min(0.85, Math.round(evolved * 100) / 100));
    });
    const mode = NOX_CHAOS_MODES[Math.floor(random() * NOX_CHAOS_MODES.length)].id;
    const candidate = createNOXChaosRecipe("NOX EVOLVE " + String(attempt + 1).padStart(3, "0"), uniqueIds, weights, mode);
    const signature = getNOXChaosRecipeSignature(candidate);
    if (!signature || seen.has(signature)) continue;
    const score = scoreNOXChaosRecipe(candidate, prior);
    if (score > bestScore) { best = candidate; bestScore = score; }
    if (score >= 0.72) break;
  }
  if (!best) return null;
  return Object.freeze({ ...best, score: bestScore, signature: getNOXChaosRecipeSignature(best) });
}
