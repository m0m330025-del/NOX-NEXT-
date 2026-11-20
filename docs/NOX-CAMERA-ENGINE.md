# NOX NEXT Camera Engine — rebuild

This branch replaces the previous camera controller with a standalone browser camera pipeline.

## Implemented
- Camera permission flow with secure-context and API checks.
- Front/rear camera selection, using track constraints when supported and stream reacquisition as fallback.
- Adaptive capture constraints based on reported memory and CPU hints, with a conservative fallback request.
- Live WebGL shader rendering for the built-in color looks, with a Canvas 2D fallback when WebGL is unavailable.
- Circular lens wheel generated from one lens registry; tap and pointer-swipe selection.
- Photo capture from the rendered output, optional Arabic caption, local download.
- Video recording from the rendered canvas when MediaRecorder and canvas captureStream are supported.
- Local media picker preview; object URL cleanup.
- Diagnostics panel for secure context, APIs, renderer, active stream resolution, and face API availability.
- Camera tracks stop when leaving the camera screen, hiding the page, or closing the page.

## Explicit limitations
- Browser camera APIs are not universally available; HTTPS and user permission are required.
- MediaRecorder codecs and file formats vary by browser. The app checks support and disables recording when the required APIs are missing.
- FaceDetector is only reported as a capability hint. Face tracking and skin smoothing are NOT implemented in this version; no fake beauty control is shown.
- This source-level change has not yet been exercised on physical Android/iOS devices. Device-specific permission, camera switching, thermal, and recording tests remain required.
- This repository currently has no package.json or configured automated test command in the inspected root. Validation in this change is source review only; do not treat that as a successful device test.

## Manual device test checklist
1. Open the deployed HTTPS site in Android Chrome and iOS Safari.
2. Enter Camera and grant camera permission; verify live moving preview.
3. Switch front/rear cameras and repeat.
4. Tap each circular lens and swipe the wheel; verify live color changes.
5. Capture a photo with and without a caption; save and open the file.
6. Record 5–10 seconds, stop, save, and play the file.
7. Deny permission, revoke permission, and test a device with no camera.
8. Test on a low-memory phone and verify the diagnostics report the active renderer and actual stream dimensions.
9. Navigate away and back; verify camera indicator turns off after leaving.


## Expanded filter catalog (340 presets)

- The original 200 presets remain in their original ten visual families.
- 140 additional named presets are exposed in seven new picker groups: face makeup, skin/beauty looks, hair looks, eyes/brows/lashes, backgrounds, depth/portrait looks, and particles/decorations.
- These 140 are currently mapped to existing shared WebGL color-grade families so they can be previewed immediately in the live camera picker. They are **not** dedicated semantic effects: no face-landmark makeup placement, hair segmentation/color isolation, eye/brow tracking, background removal, depth estimation, or particle-follow engine is claimed as implemented.
- The picker grouping and 340-entry catalog are source-level changes. Camera permission, live rendering, and recording still require physical-device testing.
- Galaxy M12 performance should be checked with the adaptive quality tiers; the new presets do not create 140 separate shader programs.

## Sparse Optical Flow and CORTEX integration

- The block-matching calculation is isolated in `core/nox-optical-flow-engine.js` and accepts bounded grayscale byte planes (maximum dimension 128 by default).
- The camera samples at 48×36 in low-power mode and 64×48 otherwise; it keeps the existing 160 ms / 240 ms sampling interval and uses a small search radius (2 / 3 pixels).
- NOX CORTEX plans and executes the `optical-flow` handler. Camera session tokens discard stale results after stop/restart or camera changes; only one flow request is allowed in flight.
- The reported confidence is a local match-uniqueness/texture heuristic, not a calibrated probability or a measure of semantic correctness. Low-texture and identical frames may produce no vectors.
- The new deterministic test covers translated texture, vector direction/ranges, still frames, input bounds, and reset behavior. GitHub Actions is configured to run it for relevant PR and branch pushes.
- This is a source-level integration only. It has not been benchmarked or tested on Galaxy M12 or iOS hardware; do not assume real-device frame-rate or thermal performance.


## NOX Temporal Memory Engine (policy extraction)

- Ring-buffer policy is isolated in `core/nox-temporal-memory-engine.js`: bounded sample dimensions, Lite/standard slot counts and capture intervals, freshness timestamps, write-slot selection, sequence, reset/invalidation, and deterministic composite-layer plans.
- `core/camera.js` remains the Canvas adapter: it allocates/captures the actual canvases and draws the returned layers. The live rendering path remains synchronous; no asynchronous work was added to the frame loop.
- Existing profiles are preserved: Lite samples at a maximum side of 160 with 3 slots / 180 ms; standard samples at a maximum side of 224 with 4 slots / 120 ms.
- This extraction does not align historical frames with optical flow, estimate camera motion for temporal warping, or guarantee ghost suppression. The CORTEX `temporal-memory` dependency remains a registry contract and is not claimed as an executed camera handler.
- A deterministic Node test covers profile sizing, capture cadence, ring wrap, composite-plan modes, reset, and invalid inputs. Physical-device performance and visual quality remain untested.

## NOX Temporal Alignment Engine (confidence-gated translation)

- `core/nox-temporal-alignment-engine.js` converts the existing sparse optical-flow vectors into a robust median global translation for the bounded temporal-memory slots.
- A sample is accepted only when enough vectors pass the confidence gate and their displacement dispersion stays bounded. Duplicate/stale flow sequences are ignored.
- Per-slot translation is accumulated only while it remains within a strict drift limit. A slot is invalidated rather than allowed to drift indefinitely; a newly captured slot starts with a zero transform.
- The camera adapter applies the accepted translation while drawing temporal-memory samples. It does not add asynchronous work to the render loop; it consumes the latest completed optical-flow result.
- This is global 2D translation only. It does not estimate rotation, zoom, parallax, depth, rolling shutter, or dense per-pixel deformation. It cannot guarantee complete ghost removal.
- Deterministic tests cover confidence filtering, stale sequences, inconsistent vectors, slot reset, and accumulated-drift invalidation. Optical-flow, temporal-memory, and temporal-alignment tests are all included in the camera workflow.
- Real-scene visual quality, edge cropping, device performance, heat, and battery impact remain unverified until tested on physical devices, including Galaxy M12.


## Temporal Alignment validation hardening

- Sparse flow now retains confident zero-displacement vectors, allowing textured stationary frames to confirm that no translation occurred instead of appearing as missing motion data.
- If a flow sample has too few confident vectors, inconsistent vectors, or a displacement beyond the supported per-sample bound, previously accumulated slot transforms are invalidated. The renderer therefore skips those uncertain historical samples instead of reusing a stale alignment.
- Per-sample translation is no longer silently clamped: over-bound movement is rejected. The default accepted step bound is 0.065 normalized units per axis; accumulated drift remains bounded to 0.12.
- A deterministic integration test connects synthetic translated pixel frames through sparse optical flow and temporal alignment. This validates vector sign, normalization, and the resulting transform together.
- These are conservative source-level safeguards, not proof of visual quality on real scenes or device performance.

- A spatial-span gate now rejects vector sets confined to a small image region, reducing the chance that a locally moving subject is mistaken for global camera motion. It requires confident samples to span at least 25% of both normalized image axes; this is conservative and can reject valid camera motion in low-texture scenes.


## Optical Flow configuration hardening

- Non-finite constructor and per-frame tuning values now fall back to documented safe defaults rather than producing NaN loop bounds or silently empty results.
- Configured maximum sample dimensions are clamped to 256 pixels per side to keep the block-matching workload bounded; the default remains 128.
- Confidence thresholds are clamped to the inclusive 0–1 range. The confidence output remains a local heuristic, not a calibrated probability.
- Deterministic tests cover invalid configuration, upper bounds, and safe fallback behavior. This does not replace device profiling or visual validation.


## NOX Smart Motion Separation (dominant global-flow consensus)

- `core/nox-smart-motion-separation-engine.js` evaluates sparse flow vectors and finds a dominant displacement consensus using bounded residual matching.
- Global camera-motion candidates must contain at least 55% of usable vectors, meet a minimum sample count, and span at least 25% of both normalized image axes. Equal competing motion populations are rejected rather than guessed.
- Non-consensus vectors are kept separate. Spatially connected, motion-consistent outlier groups are exposed as localized-motion candidates; this is not semantic person/object detection.
- The camera passes only the accepted global-consensus vectors to Temporal Alignment. Existing optical-flow vectors remain available to other camera features.
- Deterministic tests cover background translation with a moving local cluster, ambiguous competing motion populations, local-only motion, and the alignment handoff.
- The algorithm is sparse 2D motion segmentation, not dense optical flow, object recognition, depth estimation, or guaranteed foreground masking. Visual quality and device cost still require real-scene tests on Android Chrome, including Galaxy M12.


## NOX Adaptive Temporal Fusion Engine

- `core/nox-adaptive-temporal-fusion-engine.js` is a deterministic policy layer between the temporal-memory plan and Canvas compositing.
- Each historical layer must pass alignment-confidence and freshness gates. Its opacity is then weighted by alignment confidence, dominant-motion confidence, background-consensus ratio, and exponential age decay.
- If the current motion-separation result is missing, ambiguous, or below its confidence/consensus gates, historical layers are not composited. The current live camera frame remains the visible base.
- The policy returns selected and rejected layer decisions with reasons for diagnostics. It does not generate pixels or perform per-pixel/semantic foreground masking.
- Deterministic tests cover confidence-based selection, age decay, stale-layer rejection, low alignment confidence, ambiguous motion, and insufficient background consensus.
- The implementation is source-level only; visual tuning, edge behavior, and performance must be checked on real scenes and target devices before making image-quality claims.

## NOX Multi-Engine Intelligence Brain

- `core/nox-multi-engine-intelligence-brain.js` evaluates existing camera signals and produces a deterministic, explainable coordination plan.
- Inputs are limited to measured or already available values: low-power device hint, measured render cost and target frame budget, optical-flow vector count/confidence/age, dominant-motion consensus, temporal-alignment status, and whether temporal mode is enabled.
- It classifies the current pipeline as usable, held, protected, or inactive. Historical fusion is considered eligible only when fresh flow, accepted global-motion consensus, and valid aligned history are all present; otherwise the live frame is explicitly protected.
- The quality governor only recommends a lower-cost profile when measured render cost crosses the configured budget. This first integration does not silently change quality tiers or toggle engines.
- The brain does not infer temperature, battery state, scene semantics, depth, or sensor properties that the browser does not expose. It does not create pixels or replace the specialist engines.
- A deterministic test covers a complete evidence-backed path, low-power overload, stale flow, ambiguous motion, missing data, missing alignment, disabled temporal mode, and reset behavior.
- This is a source-level coordination layer. CI does not establish real-device performance or visual improvement; Android Chrome testing remains required.

## NOX Neural Camera Orchestrator

- `core/nox-neural-camera-orchestrator.js` wraps the Multi-Engine Intelligence Brain with a bounded, session-only decision memory.
- It records only measured render duration and the active frame-time budget. The history is capped (12 samples by default), is reset when the camera session starts/stops, and is never written to local storage or sent to a server.
- Three or more overload samples in the latest four observations produce a reduce-load recommendation. Five or more stable samples in the latest six can produce a one-tier recovery recommendation, subject to the low-power minimum tier.
- Recommendations are diagnostic only. The orchestrator does not switch quality tiers, toggle engines, infer battery/temperature, or train a neural network. "Neural" is the feature name; the implemented policy is deterministic and testable.
- Invalid measurements are ignored. Deterministic tests cover overload, recovery hysteresis, low-power floor, bounded history, invalid input, and reset.
- Measurements are collected once per rendered camera frame. Browser CI does not prove device-specific benefit; real profiling is still required.


## NOX Predictive Camera Intelligence

- `core/nox-predictive-camera-intelligence.js` estimates a single short-horizon motion step from fresh, confident sparse optical-flow vectors. It uses robust median displacement, an inlier-consensus gate, measured sample intervals, and a bounded extrapolation horizon.
- At least two timed flow observations are required. Conflicting vectors, weak confidence, duplicate/out-of-order samples, stale measurements, and long gaps suppress the prediction rather than guessing.
- A direction change reduces confidence; predicted displacement is capped. High measured frame cost returns a defer-analysis recommendation so diagnostics do not compete with an overloaded render budget.
- The camera adapter records each completed optical-flow sample and displays the estimator's action, reason, confidence, and horizon in diagnostics. It does not alter pixels, camera settings, quality tiers, or engine scheduling.
- This is deterministic kinematic extrapolation, not a trained neural network, semantic scene understanding, or prediction of unseen image detail. The estimate is diagnostic only and requires real-scene/device validation before any future control integration.
- Deterministic tests cover steady motion, acceleration, direction changes, stale/invalid timing, low-confidence vectors, conflicting motion populations, and frame-budget protection.
