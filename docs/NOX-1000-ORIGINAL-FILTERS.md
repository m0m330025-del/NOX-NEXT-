# NOX ORIGINAL FILTER LIBRARY

**Version:** 1.0.0  
**Catalog size:** 1,000 deterministic recipes  
**Branch:** `feature/nox-camera-engine-rebuild`

## Design

The catalog contains ten procedural image-treatment families, each with 100 parameterized variants:

1. SPECTRAL — split-tone spectral remapping
2. THERMAL — false-colour luminance mapping
3. AURORA — animated interference veils
4. CHROMATIC — spatial RGB channel displacement
5. DREAM — pastel haze and bloom-like lift
6. CONTOUR — engraved contour treatment
7. HALFTONE — spatial dot modulation
8. SOLAR — dual-threshold solarization
9. NOCTURNE — cool shadows and radial vignette
10. PRISMATIC — radial angular interference

Each recipe has its own deterministic seed, palette, intensity, contrast, saturation, grain, phase, scale, warp, and glow values. The variants are not 1,000 labels pointing to the same preset.

## API

```js
import {
  listNOXFilters,
  getNOXFilter,
  applyNOXFilter,
  NOX_FILTER_COUNT
} from "./nox-original-filter-library.js";

const filters = listNOXFilters({ limit: 30 });
const auroraVariants = listNOXFilters({ family: "AURORA" });
const chosen = getNOXFilter("nox-0003");
applyNOXFilter(imageData, chosen.id, performance.now() / 1000);
```

`applyNOXFilter` mutates and returns the supplied Canvas `ImageData`. For animation, pass an increasing time value. Call it on a working frame, not on the camera's original source buffer.

## Integration boundary

This is a real procedural pixel-processing library, but it is **not yet wired into the live NOX camera UI, WebGL shader pipeline, recording, or photo-export path**. It does not claim face landmarks, face-aware makeup, hair segmentation, depth estimation, or background replacement. Those require dedicated providers and runtime integration.

## Acceptance tests required before production

- Catalog contains exactly 1,000 unique IDs.
- Each family returns exactly 100 recipes.
- All recipe numeric parameters are finite and bounded.
- Unknown IDs and malformed ImageData fail clearly.
- Every recipe transforms a deterministic test frame without NaN/Infinity.
- Animated families change output when time changes.
- Benchmark 720p and 1080p frames on supported mobile and desktop devices.
- Verify live preview, photo capture, and recorded video use the same selected recipe.
- Add WebGL parity only after the shader path is independently tested.
