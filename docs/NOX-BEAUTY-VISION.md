# NOX Beauty Vision — implementation status

## Implemented

- The camera page has an opt-in **NOX BEAUTY VISION — REAL AI** panel.
- The user must start the camera and press the panel button; model loading is not automatic.
- `NOXMediaPipeSelfieProvider` uses MediaPipe Tasks Vision `1.2.3` and Google's `selfie_multiclass_256x256` Image Segmenter model.
- The input frame is downscaled with its aspect ratio preserved so its largest dimension is at most 256 pixels.
- Inference uses the CPU delegate for compatibility; it processes one still camera frame per button press, not every preview frame.
- Only the model's face-skin class (class index 3) is accepted. The largest connected face-skin component is retained, and its mask is shown as a translucent overlay.
- The model and WASM runtime are fetched from their official CDNs when the user first requests the feature. The loaded model is disposed when the camera stops.
- The image frame is processed locally in the browser. MediaPipe's documented privacy notice says input images are processed on-device, while usage/diagnostic metrics may be sent to Google.

## Model classes

The multiclass model identifies six classes:

| Index | Class | NOX use |
|---:|---|---|
| 0 | Background | Not used |
| 1 | Hair | Not used in this provider |
| 2 | Body skin | Not used in this provider |
| 3 | Face skin | Accepted for face-skin preview |
| 4 | Clothes | Not used |
| 5 | Others / accessories | Not used |

## Explicit limitations

- This model does not return separate lip, eyelid, eyebrow, or cheek masks.
- It does not identify cosmetic shades, skin tone suitability, or beauty preferences.
- This MediaPipe model does not return separate lip, eyelid, eyebrow, or cheek masks and does not apply makeup. Its face-skin preview remains a user-triggered diagnostic.
- A separate BiSeNet ResNet-18 provider supplies semantic lip and brow masks. The NOX live makeup controller sends bounded frames through that provider and the makeup renderer.
- Accepted makeup is composited into the shared `renderCanvas`, so the same fresh layer can appear in preview, captured photos, and recorded video. Results older than 220ms are dropped; expired results are not drawn.
- The BiSeNet masks do not include dedicated cheek or eyelid classes. Those looks remain unavailable rather than being approximated from unrelated regions.
- The MediaPipe result's displayed probability is the mean of model probabilities for selected face-skin pixels. It is not a calibrated accuracy percentage.
- Continuous BiSeNet inference is opt-in and runs serially at a bounded interval. Results are freshness-gated, but fast head motion can still cause temporary misalignment; no dense motion-warp compensation is claimed.
- The provider requires an internet connection for its first CDN/WASM/model load. Offline caching has not been implemented.
- Performance, heat, memory usage, and visual quality have not been tested on a physical Galaxy M12. Do not assume real-time performance on that device.

## Sources

- [MediaPipe Image Segmenter guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)
- [MediaPipe Tasks Vision JavaScript API](https://developers.google.com/edge/api/mediapipe/js/tasks-vision)
- [MediaPipe multiclass segmentation model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)
- [MediaPipe Tasks Vision privacy notice and package documentation](https://www.npmjs.com/package/@mediapipe/tasks-vision)

## Status

**Code and CI:** the MediaPipe face-skin diagnostic, BiSeNet semantic masks, makeup renderer, live controller, and shared-canvas compositor are implemented; relevant GitHub Actions checks pass.

**Physical-device verification:** not performed on Android/iOS or low-power phones.

**Visual alignment and sustained real-time performance:** require browser and physical-device testing.
