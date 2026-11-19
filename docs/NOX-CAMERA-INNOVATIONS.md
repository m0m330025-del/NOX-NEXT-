# NOX NEXT Camera Engine — Innovation Specification

Status: approved product scope; implementation is staged and must be verified feature by feature.
Target branch: feature/nox-camera-engine-rebuild
Non-goal: do not merge or publish until source checks and real-device tests pass.

## Product identity

NOX Camera should feel like one coherent camera engine, not a collection of unrelated filter buttons. The circular lens system, live preview, color pipeline, adaptive performance controller, and capture workflow are the core.

## Approved innovations and implementation plan

### P0 — foundational, first implementation wave

1. **NOX Smart Lens**
   - Scene hints: portrait/face, landscape, low light, food, and motion.
   - Start with conservative on-device heuristics from frame brightness, contrast, and motion; do not claim semantic AI recognition until a real model is integrated and tested.
   - Suggest a lens; never silently change a user's chosen lens. Provide Auto / Manual states and a clear explanation.
   - Acceptance: suggestions update without blocking preview; manual selection always wins.

2. **NOX Color Signature**
   - Own shader-based color looks with consistent tone mapping and adjustable strength.
   - Keep WebGL as the preferred path and Canvas 2D as a graceful fallback.
   - Avoid copying third-party LUTs or claiming color science not implemented.
   - Acceptance: same named look has documented behavior in both render paths; capture and recording match preview.

3. **NOX Twin Vision**
   - Side-by-side or draggable before/after live comparison using the same camera frame.
   - The comparison must not request a second camera stream.
   - On constrained devices, allow a tap-to-toggle comparison if two simultaneous render surfaces are too expensive.
   - Acceptance: both views use the same source frame and selected effect; no duplicate camera permission or stream.

4. **NOX Adaptive Rescue**
   - Monitor frame timing and rendering failures; lower render resolution/effect workload in steps.
   - Restore quality gradually after stable performance.
   - Use memory/CPU hints only as hints, not as reliable measurements. Do not promise thermal readings where the browser exposes none.
   - Acceptance: camera remains usable when effects are reduced; diagnostics explain the active quality tier.

5. **Circular Gesture Lens**
   - Keep the circular orbit as the primary interaction.
   - Add accessible tap targets, keyboard focus, swipe selection, and press/hold before-after comparison.
   - Gesture controls must not interfere with page scrolling or camera capture.

### P1 — advanced capture and creative tools

6. **NOX Virtual Light Studio**
   - Live, adjustable color/brightness lighting treatments (soft, warm, cool, cinematic).
   - Clearly label these as image-processing effects, not real relighting or 3D light reconstruction.
   - Add face-aware local lighting only after reliable face landmarks exist.

7. **NOX Moment Memory**
   - Optional short rolling frame buffer for selecting a frame from just before/after the shutter moment.
   - Keep the buffer in memory only, with a short fixed duration, no upload, and immediate release when camera stops or the feature is disabled.
   - Respect memory limits and disable on devices that cannot sustain it.
   - Acceptance: user explicitly enables it; buffer is never persisted or transmitted.

8. **NOX Eye (scene assistant)**
   - Give concise composition and exposure suggestions.
   - Offline/basic mode may use measurable image properties. Face, object, and scene labels require a separately integrated model and must be disclosed.
   - Suggestions are advisory and never block capture.

## Engineering constraints

- Preserve the current camera permission flow and one-stream architecture.
- Keep all camera code isolated from unrelated NOX social features.
- No fake controls: hide or label any feature that is not implemented.
- Avoid adding a second camera stream for comparisons.
- Use feature detection and fallbacks; unsupported capabilities must not crash camera startup.
- Keep the Galaxy M12 / Android Chrome as a low-resource target while retaining responsive support for modern Android and iOS browsers.
- No network upload of camera frames for these features.
- Release animation frames, media tracks, object URLs, WebGL resources, and any rolling frame buffers when leaving the camera or stopping it.
- Respect user-selected lens/effect; automation only suggests unless the user opts into Auto.

## Verification gates

For every feature, record: supported browsers, fallback behavior, memory/performance impact, capture/record parity, accessibility, and physical-device test results.

Required device test matrix:
- Samsung Galaxy M12 / Android Chrome (primary low-resource test).
- At least one newer Android phone.
- iPhone / Safari where available.
- Permission denied/revoked, no camera, camera busy, front/rear switching, background/foreground, and low-memory conditions.

## Current status

The existing rebuild has a WebGL color pipeline, Canvas 2D fallback, circular lens selection, local photo capture, and canvas-based recording in source. The following innovations are **specified but not yet implemented or device-verified**: Smart Lens scene suggestions, Twin Vision, Virtual Light Studio controls, Moment Memory, Eye guidance, and the new Color Signature system. Adaptive Rescue currently has basic device-hint-based quality selection only; dynamic performance feedback and recovery remain to be implemented. Existing circular gestures are basic swipe/tap, not the full accessibility/press-hold interaction.

Do not describe this specification as proof that these features work. Update this status only after code changes and tests establish each behavior.

## P2 — signature research concept: NOX MOMENT DNA

**Concept:** turn a captured moment into an editable, locally stored capture recipe rather than treating the final image as the only surviving result. The user can revisit the moment and adjust supported visual decisions after capture. This is a proposed NOX design direction, not a claim of a globally unprecedented invention or an already working feature.

### User experience

- Before or after capture, the user can draw simple intent marks on the preview/image: outline a subject to preserve it, mark a background region for a separate look, indicate a preferred light direction, or identify an area where motion should be emphasized.
- The editor presents the available controls supported by the captured data. It must never show an adjustment as available if the required map or frame data was not captured.
- The user can reopen the recipe, change effect strength or region choices, and render another result without overwriting the original.
- The original capture remains available and is clearly distinguished from edited/generated output.

### Moment DNA data model

A capture package may contain these optional, versioned components:

1. **Intent Map:** user-drawn strokes, points, masks, and region labels, stored in normalized image coordinates.
2. **Scene Map:** lightweight per-pixel or region maps for subject/background separation, approximate depth, motion, and illumination where those maps can be reliably produced. Every map records its method, confidence/limitations, dimensions, and version. Do not imply accurate depth or semantic understanding when only a heuristic is available.
3. **Moment Timeline:** a short, optional in-memory ring buffer of frames around the shutter moment. Persist only the user-selected frame(s) if the user explicitly chooses them; otherwise discard the buffer promptly.
4. **Editable Recipe:** a versioned description of the source frame, user intent, effect graph, parameters, and map references. It must be possible to render the original result again from the package where the required source data remains available.
5. **Render Graph:** ordered, deterministic image operations with GPU/WebGL implementation and a Canvas 2D or reduced-quality fallback where feasible.
6. **Integrity and provenance:** retain the untouched original, identify edited outputs, and disclose synthetic or composited changes. Do not present reconstructed lighting, depth, or motion as factual evidence of the original scene.

### Device tiers and privacy

- **Lite tier (Galaxy M12 target):** user-drawn regions, a small set of simple masks, a single selected source frame, limited recipe metadata, and low-resolution preview rendering. No mandatory neural model, large frame buffer, or background processing.
- **Enhanced tier:** optional subject segmentation, approximate depth/motion maps, and a short frame-selection window only after device capability and memory checks.
- All processing is local by default. No camera frame, map, or recipe is uploaded. Any future export/share action must be explicit and user initiated.
- Provide a clear storage estimate, a delete-package action, and automatic cleanup of temporary frame buffers. Never silently retain a rolling video buffer.

### Implementation stages and acceptance gates

- **P2-A — recipe foundation:** define a versioned JSON-like internal schema, normalized coordinates, original/edited asset relationship, and deterministic re-render for existing supported filters. Acceptance: save, close, reopen, and reproduce the same supported edit without changing the original.
- **P2-B — intent drawing:** add touch-friendly region/stroke drawing and simple masks. Acceptance: marks remain aligned across preview scaling, rotation, and exported image dimensions.
- **P2-C — lightweight scene maps:** add only measurable, tested maps (initially manual subject/background regions and basic motion/brightness hints). Acceptance: confidence and limitations are visible; unsupported maps disable dependent controls.
- **P2-D — moment timeline:** optional, bounded ring buffer with explicit opt-in and memory-budget checks. Acceptance: buffer is local, bounded, never uploaded, and released on stop/disable/background transitions.
- **P2-E — advanced maps:** investigate optional segmentation/depth/lighting models behind capability checks. Acceptance: compare quality, latency, battery, and memory on real devices before enabling by default.

### Non-goals and safeguards

- This is not a claim of true light-field capture, physically accurate 3D reconstruction, perfect subject isolation, or recovery of information the camera never recorded.
- Do not promise arbitrary refocus or relighting from a single ordinary image. Such controls must be limited to available maps and source data.
- Do not overwrite originals, silently upload data, or fabricate scene details.
- Do not block ordinary photo capture if Moment DNA is unavailable, disabled, or too expensive.

### Status

**Specification only — not implemented and not device-tested.** The concept requires a separate prior-art/patent search before making any novelty, ownership, or patentability claim. It must be implemented incrementally on the camera feature branch and pass the existing verification gates before any merge or release.

## P3 — experimental signature direction: NOX REALITY SKIN

**Approved concept direction:** a material-and-motion visual-effects engine in which a filter is not merely a color grade or a sticker overlay. The user assigns a virtual material and behavior to selected regions or tracked subjects; the effect then responds consistently to movement and scene changes across successive frames.

This is a research and product specification, not a claim that the concept is globally unprecedented, physically accurate, or already implemented. Existing patent literature includes real-time neural stylization on mobile devices and artistic effects applied to live camera streams. A formal prior-art search is required before any novelty or patentability claim.

### Core invention hypothesis — NOX Reality Physics Engine

Build a reusable effect graph with four cooperating layers:

1. **Intent Layer:** user selects a person, object, or manually painted region and assigns a material/behavior. Manual region selection must work without a neural model.
2. **Continuity Layer:** tracks the selected region across frames, estimates motion, and manages temporary occlusion. If tracking confidence falls, freeze/fade the effect or ask for reselection rather than attaching it to the wrong object.
3. **Material Layer:** renders a selected visual material using consistent parameters over time. Initial materials may include liquid-metal appearance, energy trails, glass-fragment illusion, smoke-like trails, and flowing-water appearance. These are stylized image effects, not real physical simulations.
4. **Interaction Layer:** responds to measured motion, touch gestures, and scene changes. Each effect must expose its inputs and limitations; no hidden claim of real-world physics.

### Signature filter experiences

- **Living Metal:** metallic shading and animated highlights follow the tracked subject/region. Highlights are stylized; do not claim true environment reflections unless an environment map is actually captured.
- **Motion Trace:** a controlled temporal trail follows movement and decays over time. Include trail length, opacity, and direction controls.
- **Shatter World:** a selected region appears to split into animated virtual fragments when a gesture or motion trigger occurs. The effect must not imply that the real object physically broke.
- **Matter Shift:** selected regions transition among visual material styles (water-like, smoke-like, energy-like). The engine must preserve region boundaries as far as tracking allows and provide a clear fallback when segmentation is unavailable.

### Rendering and tracking architecture

- Use a single camera stream. Derive effect frames from the existing preview pipeline.
- Separate tracking/mask generation from material rendering so effects can share masks and motion data.
- Prefer WebGL shaders for compositing and temporal trails; provide Canvas 2D or reduced-effect fallbacks.
- Reuse existing frame scheduling and Adaptive Rescue controls. Do not create independent animation loops per filter.
- Apply confidence-aware temporal smoothing to reduce flicker; reset or fade state on scene cuts, camera switching, permission loss, and tracking failure.
- Bound all history buffers by time and resolution. Release them when the effect is disabled or the camera stops.
- Never upload camera frames for processing by default.

### Device tiers

- **Lite (Galaxy M12 priority):** one selected region, manual mask tools, simple motion vectors/centroid tracking where feasible, shader-based materials, short low-resolution trail history, and reduced particle counts. Disable expensive segmentation and fragment simulations.
- **Standard:** optional lightweight on-device segmentation/tracking if benchmarked and supported; multiple effect parameters and richer temporal trails.
- **Advanced:** optional higher-resolution masks, more particles, and richer material shading after capability checks. No feature may assume a particular GPU or neural accelerator.

### Accessibility and user control

- Provide obvious Auto/Manual controls; automatic tracking may suggest or follow only after user opt-in.
- Make effects adjustable and removable at any time; preserve the original capture.
- Provide reduced-motion mode, intensity controls, touch-friendly selection, and accessible labels.
- Do not cover essential camera controls with gesture zones.

### Staged implementation and acceptance

- **P3-A — material shader prototype:** implement one material effect on a manually selected static region. Acceptance: stable preview, capture parity, and clean fallback.
- **P3-B — motion trace:** add a bounded temporal trail driven by measured region movement. Acceptance: no unbounded memory growth, no duplicate animation loop, and stable behavior under frame drops.
- **P3-C — region continuity:** add tracking/mask continuity and confidence display. Acceptance: effect does not jump to unrelated objects during occlusion; it fades or requests reselection when confidence is low.
- **P3-D — interactive material events:** add gesture/motion-triggered shatter and matter-shift transitions. Acceptance: triggers are user-configurable, reversible, and clearly stylized.
- **P3-E — multi-device optimization:** benchmark on Galaxy M12, a newer Android phone, and iPhone Safari where available. Record frame rate, dropped frames, memory, battery impact, thermal behavior only where measurable, and fallback behavior.

### Verification and truthfulness safeguards

- Compare preview, photo capture, and video recording output for visual consistency.
- Test camera switching, app background/foreground, low memory, denied permissions, scene cuts, and loss of tracking.
- Label simulated materials and fragments as visual effects. Never imply that the camera measured actual material properties or reconstructed physical events.
- Keep original captures untouched and distinguish edited outputs.
- No fake controls: unavailable tiers/effects must be disabled or clearly marked as experimental.

### Status

**Specification only — not implemented and not device-tested.** This is an approved direction for research and staged engineering, not proof of worldwide novelty. Before implementation is described as an invention or patent candidate, search relevant patent claims and research on neural stylization, video object tracking, temporal effects, material rendering, and interactive AR filters.


 
## P4 — NOX 200-Preset Filter Engine (first integrated wave)

- Added a local catalog of 200 named presets in ten visual families: material, motion-inspired, energy, world, speed, portrait-inspired, weather, cinema, interactive-inspired, and experimental.
- The first integrated renderer maps those presets to ten shared shader families, with a Canvas CSS-filter fallback. The same preview canvas is used for photo capture and video recording.
- The catalog is selectable in the camera UI and does not request another camera stream or upload camera frames.
- Important limitation: presets are parameter variations over shared families, not 200 individually hand-authored algorithms. Motion/portrait/interactive names currently indicate visual styling only; they do not imply semantic object tracking, face landmarks, voice/gesture recognition, temporal frame reconstruction, real weather simulation, or physical material simulation.
- The current shader has animated time-dependent styling for selected families, but no temporal frame-history buffer. Living Metal remains a manually placed circular overlay, not object segmentation.
- Device verification is still required. Automated checks can verify syntax, catalog size, and UI hooks only; they cannot establish visual quality, frame rate, battery use, or compatibility on Galaxy M12/iPhone.

**Status:** first 200-preset selector and shared GPU/Canvas rendering families integrated on the feature branch; advanced tracking, temporal memory, segmentation, and device testing remain incomplete.
