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
- It does not apply makeup. The current camera integration only previews the face-skin segmentation mask.
- The result's displayed probability is the mean of model probabilities for selected face-skin pixels. It is not a calibrated accuracy percentage.
- The current browser integration is a user-triggered still-frame test to avoid continuous CPU inference on low-power phones.
- The provider requires an internet connection for its first CDN/WASM/model load. Offline caching has not been implemented.
- Performance, heat, memory usage, and visual quality have not been tested on a physical Galaxy M12. Do not assume real-time performance on that device.

## Sources

- [MediaPipe Image Segmenter guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)
- [MediaPipe Tasks Vision JavaScript API](https://developers.google.com/edge/api/mediapipe/js/tasks-vision)
- [MediaPipe multiclass segmentation model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)
- [MediaPipe Tasks Vision privacy notice and package documentation](https://www.npmjs.com/package/@mediapipe/tasks-vision)

## Status

**Code and CI:** implemented and verified on GitHub Actions.

**Physical-device verification:** not performed.

**Makeup rendering from real facial subregion masks:** not implemented.
