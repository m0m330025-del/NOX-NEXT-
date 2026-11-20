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

## Camera integration status

The 1,000-entry catalog is now exposed in the existing NOX camera filter selector under **NOX ORIGINAL — 1000 procedural filters**. The live WebGL path maps each selection to one of ten GPU families and its 0–99 variant value, so the camera preview and the existing canvas-recording path render the selected family/variant together. The Canvas 2D fallback uses a family-level approximation; it cannot reproduce the full GPU look.

The exported `applyNOXFilter` CPU pixel processor is a separate renderer-agnostic utility and is not invoked on every live frame, avoiding a costly full-frame CPU readback. The GPU integration currently uses the family/variant coordinates rather than every metadata parameter in the catalog. It does not claim face landmarks, face-aware makeup, hair segmentation, depth estimation, or background replacement. Those require dedicated providers and verified runtime integration.

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


## NOX HYBRID LAB — first integrated blend engines

The original catalog remains accurately described as 10 procedural families × 100 parameterized variants; it is not 1,000 independent algorithms. A separate hybrid engine now defines six named compositions, each combining at least three distinct image-processing ideas with its own GPU composition operator:

- CHROMA TIDE — spectral channel dispersion + fluid interference + edge caustics
- PRISM FORGE — radial dispersion + contour engraving + spectral light
- QUANTUM BLOOM — particle lattice + optical bloom + phase-locked pulse
- TOPOGRAPHIC DREAM — relief contours + halftone cells + chromatic ink
- ECHO MATTER — directional sampling + temporal phase + prismatic residue
- AURORA RELIC — thin-film interference + aurora field + light sculpture

These are full-frame procedural GPU effects, not face-aware AR. ECHO MATTER uses directional frame sampling and time modulation; it does not claim measured optical flow. The hybrid shader runs after the selected base lens/filter and is included in the WebGL-rendered canvas used by photo capture and video recording. The Canvas 2D fallback cannot reproduce the shader compositions; it uses six distinct CSS filter approximations so a selected hybrid still changes the preview when WebGL is unavailable.

Tests verify recipe identity, distinct blend operators, engine composition metadata, and bounded shader controls. Browser/device rendering and frame-rate performance still require real-device verification.


### Multi-engine interactive mixer

The camera exposes a HYBRID MIXER when a hybrid preset is selected. Each of the six engines can be enabled independently, and each active layer has its own 0–85% weight control. The GPU shader uses a bit-mask to run enabled layers sequentially in one frame, with a separate weight per engine. Combinations can contain multiple simultaneous effects instead of selecting only one shader branch. The reset control clears active layers. This is a full-frame procedural compositor, not face-aware AR or a physically simulated optical pipeline.
