/**
 * NOX MediaPipe Face Landmarker Provider.
 * Produces observed 478-point face landmarks and official semantic connection
 * graphs. It does not fabricate masks or claim pixel-accurate makeup regions.
 */
const CONFIG = {
  wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm",
  modelUrl: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
};

export class NOXMediaPipeFaceLandmarkerProvider {
  constructor({ visionLoader = () => import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs"), delegate = "CPU" } = {}) {
    this.visionLoader = visionLoader;
    this.delegate = delegate === "GPU" ? "GPU" : "CPU";
    this.landmarker = null;
    this.vision = null;
    this.state = "idle";
    this.initializePromise = null;
    this.lifecycleGeneration = 0;
  }

  async initialize() {
    if (this.landmarker && this.state === "ready") return { available: true, state: "ready" };
    if (this.initializePromise) return this.initializePromise;
    const generation = this.lifecycleGeneration;
    this.state = "loading";
    this.initializePromise = (async () => {
      let createdLandmarker = null;
      try {
        const vision = await this.visionLoader();
        const fileset = await vision.FilesetResolver.forVisionTasks(CONFIG.wasmRoot);
        createdLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: CONFIG.modelUrl, delegate: this.delegate },
          runningMode: "IMAGE",
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true
        });
        if (generation !== this.lifecycleGeneration) {
          try { createdLandmarker?.close?.(); } catch { /* stale initialization cleanup */ }
          return { available: false, state: "idle", reason: "initialization-superseded" };
        }
        this.vision = vision;
        this.landmarker = createdLandmarker;
        this.state = "ready";
        return { available: true, state: "ready", provider: "MediaPipe FaceLandmarker", model: "face_landmarker.task" };
      } catch (error) {
        try { createdLandmarker?.close?.(); } catch { /* best-effort cleanup */ }
        if (generation === this.lifecycleGeneration) {
          this.landmarker = null;
          this.vision = null;
          this.state = "unavailable";
        }
        return { available: false, state: "unavailable", reason: "face-landmarker-load-failed", detail: String(error?.message || error).slice(0, 180) };
      } finally {
        if (generation === this.lifecycleGeneration) this.initializePromise = null;
      }
    })();
    return this.initializePromise;
  }

  detect(source) {
    if (!this.landmarker || this.state !== "ready") throw new Error("Face Landmarker is not ready");
    if (!source || !(Number(source.width) > 0) || !(Number(source.height) > 0)) throw new Error("Invalid face landmark image");
    const result = this.landmarker.detect(source);
    const landmarks = result?.faceLandmarks?.[0];
    if (!Array.isArray(landmarks) || landmarks.length < 468) return { detected: false, reason: "no-face-landmarks" };
    const normalized = landmarks.map((point) => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1 ||
          (point.z !== undefined && !Number.isFinite(point.z))) {
        throw new Error("Invalid normalized face landmark");
      }
      return { x: point.x, y: point.y, z: Number.isFinite(point.z) ? point.z : 0 };
    });
    return {
      detected: true,
      source: "mediapipe-face-landmarker-478",
      width: Number(source.width),
      height: Number(source.height),
      landmarks: normalized,
      blendshapes: result.faceBlendshapes?.[0]?.categories || [],
      transformationMatrix: result.facialTransformationMatrixes?.[0] || null,
      connections: {
        lips: this.vision.FaceLandmarker.FACE_LANDMARKS_LIPS,
        leftEye: this.vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        rightEye: this.vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        leftEyebrow: this.vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        rightEyebrow: this.vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        faceOval: this.vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        tessellation: this.vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION
      }
    };
  }

  async dispose() {
    this.lifecycleGeneration += 1;
    const pendingInitialization = this.initializePromise;
    const task = this.landmarker;
    this.landmarker = null;
    this.vision = null;
    this.state = "idle";
    if (pendingInitialization) await pendingInitialization;
    this.landmarker = null;
    this.vision = null;
    this.initializePromise = null;
    this.state = "idle";
    try { task?.close?.(); } catch { /* best-effort WASM cleanup */ }
  }
}
