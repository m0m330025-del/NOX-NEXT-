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
