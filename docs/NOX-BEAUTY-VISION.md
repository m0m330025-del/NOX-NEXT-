# NOX Beauty Vision — implementation status

## Live makeup path

- The camera page exposes an opt-in **NOX BEAUTY VISION — REAL AI** panel. The user starts the camera and explicitly requests model loading; inference does not start automatically.
- \`NOXBiSeNetFaceParsingProvider\` uses the BiSeNet ResNet-18 ONNX face-parsing model with ONNX Runtime Web. The current camera configuration bounds the largest input dimension to 256 pixels.
- \`NOXBeautyVisionProvider\` validates frame metadata, mask dimensions, mask values, confidence, and frame freshness before exposing semantic masks.
- The currently supported semantic makeup masks are lips and brows. The model does not provide dedicated cheek or eyelid classes; those looks are unavailable rather than guessed.
- \`NOXMakeupRenderingEngine\` validates the selected look and applies color only inside the accepted semantic masks.
- \`NOXLiveMakeupController\` serializes inference so only one frame is processed at a time. The configured interval is 180ms; results older than 220ms are rejected.
- \`NOXLiveMakeupCompositor\` builds a transparent color layer from the accepted masks and draws it over each fresh base render. It does not paint onto a previous composed frame, avoiding a feedback loop.
- The compositor is called from the camera \`renderFrame()\` path on the shared \`renderCanvas\`. Photo capture copies that canvas, and video recording uses its \`captureStream()\`, so a fresh accepted makeup layer is included in both outputs.
- If a makeup result expires, it is not drawn. A capture taken without a fresh result may therefore contain no makeup rather than a stale mask.
- Inference runs locally in the browser after the ONNX runtime and model are downloaded. Offline model caching is not implemented.

## Face landmarks are a separate capability

- \`NOXMediaPipeFaceLandmarkerProvider\` uses MediaPipe Tasks Vision to produce face landmarks for tracking and diagnostics.
- Landmark tracking is separate from BiSeNet semantic makeup masks. The landmark points are not substituted for missing cheek or eyelid segmentation.

## Explicit limitations

- The current makeup model supports lips and brows only; cheek and eyelid makeup are not implemented.
- The 220ms freshness limit reduces stale overlays but does not guarantee perfect alignment during fast head movement. Dense motion-warp compensation is not claimed.
- The controller uses a bounded low-resolution inference path. Sustained frame rate, heat, memory usage, and visual quality have not been measured on physical Android/iOS devices.
- The model/runtime require an internet connection for first load. Offline caching has not been implemented.
- CI tests use synthetic masks and fake provider sessions; they verify contracts and composition logic, not the real model's visual accuracy on a live face.

## Status

**Code and CI:** BiSeNet semantic masks, makeup rendering, live frame control, and shared-canvas compositing are implemented. Relevant GitHub Actions checks pass.

**Physical-device verification:** not performed on Android/iOS or low-power phones.

**Visual alignment and sustained real-time performance:** require browser and physical-device testing.
