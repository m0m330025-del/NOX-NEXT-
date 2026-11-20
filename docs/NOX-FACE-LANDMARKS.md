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

## What this does not mean

- The overlay is a landmark wireframe, not a filled pixel mask.
- The eye connection graph outlines the eye contour; it does not separately segment upper and lower eyelid makeup surfaces.
- Eyebrow connections are sparse landmark lines, not a hair segmentation mask.
- Cheek polygons and cheek masks are not supplied by the current Face Landmarker connection groups.
- The current makeup renderer still requires trusted semantic pixel masks. This feature does not bypass that safety/quality gate.
- No continuous real-time tracking, smoothing, or Galaxy M12 performance validation has been claimed.

## Official references

- [MediaPipe Face Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker) — describes the 478 3D landmarks, 52 blendshape coefficients, supported image/video modes, and model bundle.
- [MediaPipe FaceLandmarker JavaScript API](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.facelandmarker) — documents the exported semantic connection groups for lips, eyes, eyebrows, and face oval.
- [Official MediaPipe connection definitions](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/face_landmarker/face_landmarks_connections.ts) — source for the actual point-to-point semantic connections.

## Verification state

- Source files and CI tests added to the development branch.
- GitHub Actions results must be checked for the latest commit before describing CI as passed.
- Physical-device testing has not been performed.
