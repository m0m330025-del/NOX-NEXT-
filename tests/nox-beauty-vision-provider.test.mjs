import assert from "node:assert/strict";
import { NOXBeautyVisionProvider } from "../core/nox-beauty-vision-provider.mjs";

const now = 1_000_000;
const width = 4;
const height = 4;
const frame = { source: { frame: true }, width, height, frameId: "f-1", timestamp: now };
const faceBox = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const mask = new Float32Array(width * height).fill(0.6);

function providerOutput(overrides = {}) {
  return {
    width, height, frameId: "f-1", timestamp: now,
    source: "test-real-segmentation-provider",
    faceBox,
    fusion: { state: "fused", landmarkStatus: "aligned", alignmentIoU: 0.82 },
    landmarks: { state: "complete", source: "mediapipe-face-landmarker-478",
      width, height, regions: { lips: { points: [], edges: [] } } },
    skin: { data: mask, confidence: 0.92 },
    regions: {
      lips: { data: mask, confidence: 0.96 },
      eyelids: { data: mask, confidence: 0.91 },
      cheeks: { data: mask, confidence: 0.9 },
      brows: { data: mask, confidence: 0.88 }
    },
    ...overrides
  };
}

const adapter = new NOXBeautyVisionProvider({
  provider: { initialize: async () => ({ available: true }), segment: async () => providerOutput() },
  now: () => now
});
assert.deepEqual(await adapter.initialize(), { state: "ready", available: true });
const accepted = await adapter.processFrame(frame);
assert.equal(accepted.state, "complete");
assert.equal(accepted.skinMask.data.length, 16);
assert.equal(accepted.regionMasks.lips.source, "test-real-segmentation-provider");
assert.equal(accepted.fusion.state, "fused");
assert.equal(accepted.fusion.alignmentIoU, 0.82);
assert.equal(accepted.landmarks.source, "mediapipe-face-landmarker-478");
assert.equal(accepted.unavailable.length, 0);

// Partial output is explicit; missing semantic regions are never fabricated.
adapter.setProvider({ segment: async () => providerOutput({
  regions: { lips: { data: mask, confidence: 0.96 } }
}) });
await adapter.initialize();
const partial = await adapter.processFrame(frame);
assert.equal(partial.state, "partial");
assert.deepEqual(partial.unavailable, ["eyelids", "cheeks", "brows"]);

// Low-confidence masks are omitted, not silently promoted.
adapter.setProvider({ segment: async () => providerOutput({
  skin: { data: mask, confidence: 0.2 },
  regions: { lips: { data: mask, confidence: 0.2 } }
}) });
await adapter.initialize();
assert.equal((await adapter.processFrame(frame)).reason, "no-trusted-masks");

// Mismatched frame metadata and invalid masks fail closed.
adapter.setProvider({ segment: async () => providerOutput({ width: 8 }) });
await adapter.initialize();
assert.equal((await adapter.processFrame(frame)).reason, "provider-frame-mismatch");

const invalidMask = new Float32Array(16);
invalidMask[3] = 2;
adapter.setProvider({ segment: async () => providerOutput({
  regions: { lips: { data: invalidMask, confidence: 0.99 } },
  skin: { data: invalidMask, confidence: 0.99 }
}) });
await adapter.initialize();
assert.equal((await adapter.processFrame(frame)).reason, "no-trusted-masks");

adapter.setProvider({ segment: async () => providerOutput() });
await adapter.initialize();
assert.equal((await adapter.processFrame({ ...frame, timestamp: now - 1000 })).reason,
  "stale-or-future-frame");
assert.equal((await adapter.processFrame({ ...frame, timestamp: now + 1000 })).reason,
  "stale-or-future-frame");

let release;
adapter.setProvider({
  segment: () => new Promise((resolve) => { release = resolve; })
});
await adapter.initialize();
const pending = adapter.processFrame(frame);
await Promise.resolve();
adapter.setProvider({ segment: async () => providerOutput() });
release(providerOutput());
assert.equal((await pending).reason, "superseded-frame");


let finishInitialization;
const initializingAdapter = new NOXBeautyVisionProvider({
  provider: {
    initialize: () => new Promise(resolve => { finishInitialization = resolve; }),
    segment: async () => providerOutput()
  },
  now: () => now
});
const staleAdapterInitialization = initializingAdapter.initialize();
await Promise.resolve();
await initializingAdapter.reset();
finishInitialization({available:true});
const staleAdapterResult = await staleAdapterInitialization;
assert.equal(staleAdapterResult.available, false,
  "adapter initialization must not report ready after reset");
assert.equal(initializingAdapter.state, "idle",
  "stale adapter initialization must not overwrite the reset state");

let disposed = false;
adapter.setProvider({ segment: async () => providerOutput(), dispose: async () => { disposed = true; } });
await adapter.reset();
assert.equal(disposed, true);
console.log("NOX Beauty Vision Provider tests passed");
