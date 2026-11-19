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
