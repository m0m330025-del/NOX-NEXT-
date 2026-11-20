# NOX Camera Architecture — Stabilization Plan

Status: **Phase 0 in progress**. This document defines the target boundaries before the camera controller is split. It is intentionally incremental: preserve the working camera session and rendering behavior while moving one responsibility at a time.

## Current constraints

- core/camera.js is the integration point for camera lifecycle, UI, rendering, filters, vision, and capture. A broad rewrite would make regressions difficult to isolate.
- Preview, photo, and video must eventually consume the same composed frame. A visual effect is not considered complete if it appears only in the preview.
- Vision providers must report real capability and failure states. A deterministic policy planner is not described as a trained neural network.
- Model-backed features are not considered validated by mocked-session unit tests alone. Validation must include the real model artifact, browser runtime, CORS, output tensor shape, and measured device performance.
- CI success is not equivalent to Android/iOS device validation.

## Target module boundaries

### 1. CameraSession
Owns permission requests, stream acquisition, camera switching, track shutdown, page visibility, and session-generation tokens.

Contract:
- Exposes the active MediaStream and immutable session metadata.
- Invalidates stale asynchronous work whenever the stream changes or stops.
- Does not know about filter catalogs, beauty effects, or UI elements.

### 2. RenderPipeline
Owns the canonical frame compositor and renderer selection (WebGL with Canvas fallback).

Contract:
- Accepts a source video frame plus a render state snapshot.
- Produces one canonical output surface at a known size.
- Resizes backing stores only when dimensions change.
- Reports renderer loss/fallback instead of silently claiming GPU rendering.

### 3. LensCatalog
Owns filter metadata, family identity, parameter validation, and selection.

Contract:
- Every catalog item declares its actual implementation family and supported controls.
- Presets that share a shader family are described as variants, not unique algorithms.
- Semantic AR lenses are not listed as available until their required tracking/masks and compositing are implemented.

### 4. FaceVisionPipeline
Owns face detection, landmarks, temporal tracking, segmentation/parsing, and worker scheduling.

Contract:
- Providers are replaceable and expose explicit capability/error states.
- Temporal results are timestamped and session-scoped.
- Heavy parsing and mask post-processing move off the main thread where the runtime permits.
- Confidence values are not presented as probabilities unless calibrated.

### 5. CapturePipeline
Owns photo export, video recording, and media encoding.

Contract:
- Captures from the same canonical output surface used by the live preview.
- A selected effect must be present in preview, photo, and video, or be explicitly marked preview-only.
- Stops recording and releases tracks/resources deterministically.

### 6. PerformanceController
Owns frame pacing, quality tiers, inference cadence, and fallback decisions.

Contract:
- Uses measured frame/inference costs and device capabilities.
- Can reduce resolution or inference frequency without changing effect semantics.
- Recommendations are distinguished from actions actually applied.

### 7. CameraUI
Owns controls and presentation only.

Contract:
- Sends user intent to the session, catalog, vision, render, and capture modules.
- Does not own camera tracks, shader state, model tensors, or recording internals.

## Migration sequence

1. **Stabilize current render path** — avoid redundant WebGL canvas resizing and add regression coverage.
2. **Extract RenderPipeline** — move renderer setup, resize policy, and frame drawing behind a narrow adapter without changing UI.
3. **Unify output** — route preview, still capture, and MediaRecorder through the same composed surface.
4. **Extract CameraSession** — isolate stream lifecycle and stale-session cancellation.
5. **Move FaceVisionPipeline work off the UI thread** — real-model browser test and device profiling before enabling by default.
6. **Rebuild live beauty and AR lenses** — temporal landmarks/masks, stable overlays, and identical capture output.
7. **Rebuild filter diversity honestly** — distinct algorithm families with tests that prove each family changes pixels in its declared way.
8. **Device validation** — desktop browser automation, Android Chrome (including a low-memory device), and iOS Safari.

## Acceptance gates

A phase is not complete until:
- deterministic tests cover its public contract and failure paths;
- existing camera controls still work;
- no stale result can draw into a newer camera session;
- preview/photo/video parity is verified for affected effects;
- performance claims include measured hardware/browser details;
- limitations are documented rather than inferred from CI status.

## First stabilization change

The WebGL drawing buffer is now resized only when the output dimensions change. The viewport is still refreshed every frame. This avoids repeatedly clearing/reallocating the drawing buffer while preserving correct viewport dimensions.