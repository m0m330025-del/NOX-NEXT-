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
