import { NOXFaceTrackingEngine } from "./nox-face-tracking-engine.js";

/**
 * Backward-compatible adapter for the unified NOXFaceTrackingEngine.
 * Landmark tracking now shares its lifecycle and smoothing implementation
 * with rectangle tracking; this class contains no independent tracker state.
 */
export class NOXFaceLandmarkTemporalTracker extends NOXFaceTrackingEngine {
  update(result) {
    return this.updateLandmarks(result);
  }

  miss(reason = "face-not-detected") {
    return this.missLandmarks(reason);
  }
}
