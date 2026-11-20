/**
 * NOX Beauty Vision Pipeline v1
 *
 * Coordinates the provider adapter, skin-mask validator and makeup compositor.
 * Dependencies are injected so no model, network download, or camera permission
 * is silently activated by importing this module.
 */

export class NOXBeautyVisionPipeline {
  constructor({ providerAdapter, skinEngine, makeupEngine } = {}) {
    this.providerAdapter = providerAdapter;
    this.skinEngine = skinEngine;
    this.makeupEngine = makeupEngine;
    this.state = "idle";
  }

  async initialize() {
    if (!this.providerAdapter || !this.skinEngine || !this.makeupEngine) {
      this.state = "unavailable";
      return { state: this.state, reason: "pipeline-dependencies-missing" };
    }
    const result = await this.providerAdapter.initialize();
    this.state = result?.available ? "ready" : "unavailable";
    return { state: this.state, provider: result };
  }

  async process({ frame, image, looks = {} } = {}) {
    if (this.state !== "ready") {
      return { state: "rejected", reason: "pipeline-not-ready" };
    }
    if (!image || image.width !== frame?.width || image.height !== frame?.height ||
        !image.data || image.data.length !== image.width * image.height * 4) {
      return { state: "rejected", reason: "image-frame-mismatch" };
    }

    const vision = await this.providerAdapter.processFrame(frame);
    if (!vision || !["complete", "partial"].includes(vision.state)) {
      this.state = "ready";
      return { state: "rejected", reason: vision?.reason || "vision-provider-rejected" };
    }

    let skin = { state: "unavailable", reason: "skin-mask-not-provided" };
    if (vision.skinMask) {
      skin = this.skinEngine.validateMask({
        data: vision.skinMask.data,
        width: vision.skinMask.width,
        height: vision.skinMask.height,
        confidence: vision.skinMask.confidence,
        source: vision.skinMask.source,
        faceBox: vision.faceBox
      });
    }

    let makeup = { state: "idle", reason: "no-makeup-look-requested" };
    if (looks && Object.keys(looks).length) {
      makeup = this.makeupEngine.render(image, vision.regionMasks, looks);
    }

    const makeupApplied = makeup.state === "rendered";
    const skinAccepted = skin.state === "accepted";
    const state = makeupApplied || skinAccepted ? "processed" : "partial";
    this.state = "ready";
    return {
      state,
      frame: vision.frame,
      providerState: vision.state,
      skin,
      makeup,
      outputImage: makeupApplied ? makeup.image : image,
      unavailableRegions: vision.unavailable
    };
  }

  async reset() {
    this.state = "idle";
    this.skinEngine?.reset?.();
    this.makeupEngine?.reset?.();
    await this.providerAdapter?.reset?.();
  }
}
