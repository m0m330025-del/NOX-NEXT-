# NOX Face Landmarks Engine

## Implemented on the development branch

- Added `NOXMediaPipeFaceLandmarkerProvider`, using the official MediaPipe Tasks Vision JavaScript Face Landmarker.
- Uses the official Face Landmarker model bundle from Google's documented model location.
- Runs one still-frame inference only when the user presses the camera panel button.
- Limits the longest input dimension to 256 pixels and requests one face, CPU delegate, blendshapes, and facial transformation matrix.
- Validates the returned normalized landmark coordinates before exposing them.
- Uses the official MediaPipe connection graphs for lips, left/right eyes, left/right eyebrows, and face oval.
- `NOXFaceLandmarksEngine` validates those observed points and edges and reports unavailable regions instead of inventing them.
- The camera UI draws the actual returned connection edges and points on a transparent overlay.
- The face-landmarker resources are disposed when the camera is stopped.

## NOX Facial Mask Builder — geometry preview

- The provider now also returns the official `FACE_LANDMARKS_TESSELATION` edge graph.
- The builder reconstructs mesh triangles from those official edges and accepts the lip region only when the official lip graph forms exactly two closed loops.
- The larger loop is treated as the outer lip boundary and the smaller as the inner mouth opening; rasterization is restricted to the annulus and to the supplied face mesh triangles.
- Mesh reconstruction is bounded by 20,000 input edges, 64 neighbors per vertex, and 50,000 reconstructed triangles to reject pathological graph inputs before expensive work.
- The builder currently emits a geometry-only lip preview. It intentionally sets no confidence score, so the existing makeup compositor must reject it.
- Eyelids, brows, and cheeks remain unavailable. The eye graph does not identify upper/lower eyelid surfaces, eyebrow lines are not hair masks, and no cheek segmentation is supplied.

## What this does not mean

- The landmark overlay is a wireframe. The new lip output is a separate mesh-constrained geometry preview, not a validated semantic segmentation model.
- The eye connection graph outlines the eye contour; it does not separately segment upper and lower eyelid makeup surfaces.
- Eyebrow connections are sparse landmark lines, not a hair segmentation mask.
- Cheek polygons and cheek masks are not supplied by the current Face Landmarker connection groups.
- The current makeup renderer still requires trusted semantic pixel masks. This feature does not bypass that safety/quality gate.
- No continuous real-time tracking, smoothing, or Galaxy M12 performance validation has been claimed.
- Synthetic geometry tests validate topology/rasterization behavior only; they do not prove anatomical accuracy on real faces.

## Official references

- [MediaPipe Face Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker) — describes the 478 3D landmarks, 52 blendshape coefficients, supported image/video modes, and model bundle.
- [MediaPipe FaceLandmarker JavaScript API](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.facelandmarker) — documents the exported semantic connection groups for lips, eyes, eyebrows, and face oval.
- [Official MediaPipe connection definitions](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/face_landmarker/face_landmarks_connections.ts) — source for the actual point-to-point semantic connections.

## Verification state

- Source files and CI tests added to the development branch.
- GitHub Actions results must be checked for the latest commit before describing CI as passed.
- Physical-device testing has not been performed.


## NOX Face Topology Intelligence — first research module

- Added a read-only audit for supplied normalized landmarks and tessellation edges.
- Reports used vertices, unique and duplicate edges, connected components, maximum vertex degree, and reconstructable triangle count.
- Rejects malformed coordinates, invalid edges, oversized input, excessive vertex degree, and excessive triangle reconstruction.
- Reports disconnected components, unused points, duplicate edges, and triangle absence as warnings.
- Does not infer missing landmarks, repair geometry, claim anatomical accuracy, or authorize a makeup mask.

## Planned NOX face research roadmap

These are development targets, not claims of implementation or proven scientific novelty:

1. **NOX Face Topology Intelligence** — audit mesh structure and reject malformed topology.
2. **NOX Mask Uncertainty Engine** — expose per-region evidence gaps; missing evidence is never confidence.
3. **NOX Temporal Mask Memory** — compare observed geometry across frames and reset on track discontinuity.
4. **NOX Occlusion Intelligence** — flag likely occlusion and suppress unsupported masks.
5. **NOX Adaptive Mesh Rasterizer** — bounded triangle-local rasterization with pixel and work budgets.
6. **NOX Region Evidence Engine** — retain provenance and validation reasons for each region.
7. **NOX Expression Deformation Engine** — evaluate stability across observed expressions without assuming static contours.
8. **NOX Mask Self-Repair Lab** — propose only deterministic repairs backed by local evidence; otherwise reject.

## NOX Face Digital Twin — integration concept

A research orchestration layer may combine geometry, region evidence, temporal observations, uncertainty, and rendering eligibility. It must not invent hidden anatomy or bypass the makeup compositor trusted-mask gate. Confidence calibration requires representative real-world validation, not synthetic tests alone.


## NOX Face Research Suite — eight-engine development batch

### Implemented modules on the development branch

1. **NOX Face Topology Intelligence** — bounded mesh graph audit, duplicate-edge detection, connected components, degree limits, and triangle counts.
2. **NOX Mask Uncertainty Engine** — evidence-gap classification with explicit unknown states; no fabricated probability or confidence.
3. **NOX Temporal Mask Memory** — bounded per-track point history, frame-order checks, discontinuity resets, and observed coordinate deltas.
4. **NOX Occlusion Intelligence** — consumes caller-supplied occluded indices or per-landmark visibility; absent evidence remains indeterminate.
5. **NOX Adaptive Mesh Rasterizer** — triangle-local rasterization with pixel and operation budgets.
6. **NOX Region Evidence Engine** — per-region source, point, edge, topology, occlusion, and temporal evidence ledger.
7. **NOX Expression Deformation Engine** — compares supplied landmark positions and records supplied blendshape signals without interpreting them as anatomical truth.
8. **NOX Mask Self-Repair Lab** — conservative inspection and duplicate/invalid-edge rejection only; applies zero speculative repairs.

### NOX Face Digital Twin

NOXFaceDigitalTwin coordinates evidence, temporal, occlusion, and uncertainty reports. It is a research report layer only and always returns compositorEligible: false.

### Validation boundaries

- These engines consume supplied landmarks/visibility/region data; they do not infer hidden anatomy or semantic occluders.
- MediaPipe Face Landmarker output does not by itself establish pixel-accurate eyelid, brow-hair, or cheek segmentation.
- No numeric confidence is calibrated by these modules.
- Rasterized masks are previews only and are not trusted by the makeup compositor.
- Synthetic tests cover contracts and bounded behavior, not anatomical accuracy or device performance.
- Physical testing on Galaxy M12 and other devices remains outstanding.
