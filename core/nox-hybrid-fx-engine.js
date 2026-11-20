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
