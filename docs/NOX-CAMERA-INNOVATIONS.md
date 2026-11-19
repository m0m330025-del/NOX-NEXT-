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
