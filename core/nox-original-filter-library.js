/**
 * NOX ORIGINAL FILTER LIBRARY
 * 1,000 deterministic, distinct procedural image-processing recipes.
 * API: listNOXFilters(), getNOXFilter(id), applyNOXFilter(imageData, id, timeSeconds)
 *
 * This module is renderer-agnostic. It processes ImageData and does not claim
 * face tracking, segmentation, or live-camera integration by itself.
 */
const VERSION = "1.0.0";
const FAMILY_NAMES = [
  "SPECTRAL", "THERMAL", "AURORA", "CHROMATIC", "DREAM", "CONTOUR",
  "HALFTONE", "SOLAR", "NOCTURNE", "PRISMATIC"
];
const PALETTES = [
  [0.95, 0.25, 0.55], [0.18, 0.78, 0.92], [0.98, 0.72, 0.22],
  [0.42, 0.28, 0.96], [0.28, 0.88, 0.56], [0.96, 0.38, 0.22],
  [0.72, 0.82, 1.00], [0.92, 0.52, 0.82], [0.34, 0.48, 0.72],
  [0.96, 0.90, 0.72]
];
const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));
const fract = (v) => v - Math.floor(v);
const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1) / 255;
  const q = t * 255;
  return q * q * (3 - 2 * q);
};
const luminance = (r, g, b) => (r * 0.2126 + g * 0.7152 + b * 0.0722);

function makeRecipe(index) {
  const family = Math.floor(index / 100);
  const variant = index % 100;
  const seed = index + 1;
  const palette = PALETTES[(variant + family * 3) % PALETTES.length];
  return Object.freeze({
    id: "nox-" + String(index + 1).padStart(4, "0"),
    name: FAMILY_NAMES[family] + " / " + String(variant + 1).padStart(3, "0"),
    family: FAMILY_NAMES[family],
    palette: Object.freeze(palette.slice()),
    intensity: 0.38 + hash(seed * 1.7) * 0.58,
    contrast: 0.82 + hash(seed * 2.3) * 0.72,
    saturation: 0.55 + hash(seed * 3.1) * 1.35,
    grain: hash(seed * 4.7) * 15,
    phase: hash(seed * 5.9) * Math.PI * 2,
    scale: 2 + Math.floor(hash(seed * 7.1) * 13),
    warp: 0.4 + hash(seed * 8.3) * 5.8,
    glow: hash(seed * 9.7) * 0.45,
    seed
  });
}

const FILTERS = Object.freeze(Array.from({ length: 1000 }, (_, i) => makeRecipe(i)));
const FILTER_BY_ID = new Map(FILTERS.map((f) => [f.id, f]));

export function listNOXFilters(options = {}) {
  const family = options.family ? String(options.family).toUpperCase() : null;
  const offset = Math.max(0, Number(options.offset) || 0);
  const limit = Math.max(1, Math.min(1000, Number(options.limit) || 1000));
  const source = family ? FILTERS.filter((f) => f.family === family) : FILTERS;
  return source.slice(offset, offset + limit);
}

export function getNOXFilter(id) {
  return FILTER_BY_ID.get(String(id)) || null;
}

export function applyNOXFilter(imageData, id, timeSeconds = 0) {
  const recipe = getNOXFilter(id);
  if (!recipe) throw new Error("Unknown NOX filter: " + id);
  if (!imageData || !imageData.data || !Number.isInteger(imageData.width) ||
      !Number.isInteger(imageData.height)) {
    throw new TypeError("Expected a Canvas ImageData object");
  }
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const p = recipe.palette;
  const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const intensity = recipe.intensity;
  const phase = recipe.phase + t * (0.18 + recipe.warp * 0.035);
  const familyIndex = FAMILY_NAMES.indexOf(recipe.family);
  const centerX = (width - 1) * 0.5;
  const centerY = (height - 1) * 0.5;
  const maxRadius = Math.max(1, Math.hypot(centerX, centerY));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const nx = (x - centerX) / Math.max(1, width);
      const ny = (y - centerY) / Math.max(1, height);
      const radius = Math.hypot(x - centerX, y - centerY) / maxRadius;
      const wave = Math.sin((nx * recipe.scale + ny * recipe.scale * 0.73) * 9 + phase);
      const grain = (hash((x + recipe.seed * 31) * 0.73 + y * 17.17) - 0.5) * recipe.grain;
      const r0 = src[i], g0 = src[i + 1], b0 = src[i + 2];
      const lum = luminance(r0, g0, b0);
      let r = r0, g = g0, b = b0;

      if (familyIndex === 0) { // Spectral split-tone
        r = lum * (0.45 + p[0] * 1.25) + (r0 - lum) * 0.45;
        g = lum * (0.45 + p[1] * 1.25) + (g0 - lum) * 0.45;
        b = lum * (0.45 + p[2] * 1.25) + (b0 - lum) * 0.45;
      } else if (familyIndex === 1) { // Thermal false-colour ramp
        const q = clamp(lum * recipe.contrast + wave * 28 * intensity, 0, 255) / 255;
        r = 255 * clamp(q * 2.1, 0, 1) * p[0] + 255 * q * 0.25;
        g = 255 * Math.sin(q * Math.PI) * p[1];
        b = 255 * (1 - q) * p[2];
      } else if (familyIndex === 2) { // Aurora interference
        const veil = (Math.sin(ny * 32 + phase) + Math.cos(nx * 25 - phase * 0.7)) * 0.5;
        r += veil * 72 * p[0] * intensity;
        g += veil * 105 * p[1] * intensity;
        b += veil * 115 * p[2] * intensity;
      } else if (familyIndex === 3) { // Chromatic channel geometry
        const shift = Math.sin((ny + nx) * recipe.scale * 7 + phase) * recipe.warp * 3;
        r = src[clamp((y * width + clamp(x + shift, 0, width - 1)) * 4, 0, src.length - 4)];
        b = src[clamp((y * width + clamp(x - shift, 0, width - 1)) * 4 + 2, 0, src.length - 2)];
      } else if (familyIndex === 4) { // Dream haze + soft bloom
        const haze = (1 - lum / 255) * 28 * intensity + recipe.glow * 70;
        r = r0 * 0.78 + 255 * p[0] * 0.22 + haze;
        g = g0 * 0.78 + 255 * p[1] * 0.22 + haze * 0.7;
        b = b0 * 0.78 + 255 * p[2] * 0.22 + haze * 1.1;
      } else if (familyIndex === 5) { // Contour engraving
        const edge = Math.abs(wave) * 110 + Math.abs(lum - 128) * 0.55;
        const ink = edge > 72 + recipe.variant * 0.25 ? 235 : 24;
        r = ink * p[0]; g = ink * p[1]; b = ink * p[2];
      } else if (familyIndex === 6) { // Halftone modulation
        const cell = Math.sin(x / recipe.scale * Math.PI + phase) *
                     Math.sin(y / recipe.scale * Math.PI - phase);
        const dot = lum * (0.58 + 0.42 * cell);
        r = dot * p[0] + lum * 0.12;
        g = dot * p[1] + lum * 0.12;
        b = dot * p[2] + lum * 0.12;
      } else if (familyIndex === 7) { // Solarized dual threshold
        const threshold = 94 + wave * 38 * intensity;
        const q = lum > threshold ? 1 : 0;
        r = q ? 255 * p[0] + r0 * 0.25 : 255 * (1 - p[0]) * 0.35;
        g = q ? 255 * p[1] + g0 * 0.25 : 255 * (1 - p[1]) * 0.35;
        b = q ? 255 * p[2] + b0 * 0.25 : 255 * (1 - p[2]) * 0.35;
      } else if (familyIndex === 8) { // Nocturne vignette + cool shadows
        const vignette = 1 - Math.pow(radius, 1.45) * (0.35 + intensity * 0.5);
        r = r0 * vignette * (0.8 + p[0] * 0.25);
        g = g0 * vignette * (0.8 + p[1] * 0.25);
        b = b0 * vignette * (0.8 + p[2] * 0.25) + (255 - lum) * 0.08;
      } else { // Prismatic radial interference
        const angle = Math.atan2(ny, nx);
        const prism = Math.sin(angle * (3 + recipe.scale % 5) + radius * 24 - phase);
        r += prism * 62 * p[0] * intensity;
        g += Math.sin(prism + 2.1) * 62 * p[1] * intensity;
        b += Math.sin(prism + 4.2) * 62 * p[2] * intensity;
      }

      const contrast = recipe.contrast;
      const sat = recipe.saturation;
      const grey = luminance(r, g, b);
      r = (grey + (r - grey) * sat - 128) * contrast + 128 + grain;
      g = (grey + (g - grey) * sat - 128) * contrast + 128 + grain;
      b = (grey + (b - grey) * sat - 128) * contrast + 128 + grain;
      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
    }
  }
  return imageData;
}

export const NOX_FILTER_LIBRARY_VERSION = VERSION;
export const NOX_FILTER_COUNT = FILTERS.length;
