import assert from "node:assert/strict";
import { NOXNeuralCameraOrchestrator } from "../core/nox-neural-camera-orchestrator.js";

const orchestrator = new NOXNeuralCameraOrchestrator();
assert.equal(orchestrator.getAdaptiveRecommendation().reason, "insufficient-measured-frames");

for (const cost of [35, 36, 37, 18]) {
  orchestrator.observeFrame({ frameCostMs: cost, targetFrameMs: 33.3 });
}
const overloaded = orchestrator.getAdaptiveRecommendation({ currentTier: 1 });
assert.equal(overloaded.action, "recommend-reduce-load");
assert.equal(overloaded.reason, "repeated-frame-budget-overload");
assert.equal(overloaded.overloadSamples, 3);
const committedOverload = orchestrator.commitAdaptiveDecision(overloaded.action);
assert.equal(committedOverload.accepted, true);
assert.equal(committedOverload.cooldownRemaining, 12);
assert.equal(orchestrator.getAdaptiveRecommendation({ currentTier: 2 }).reason, "decision-cooldown-active");
orchestrator.observeFrame({ frameCostMs: -1, targetFrameMs: 33.3 });
assert.equal(orchestrator.getAdaptiveRecommendation({ currentTier: 2 }).cooldownRemaining, 12);
for (let i = 0; i < 11; i += 1) {
  orchestrator.observeFrame({ frameCostMs: 35, targetFrameMs: 33.3 });
}
assert.equal(orchestrator.getAdaptiveRecommendation({ currentTier: 2 }).cooldownRemaining, 1);
orchestrator.observeFrame({ frameCostMs: 35, targetFrameMs: 33.3 });
assert.equal(orchestrator.getAdaptiveRecommendation({ currentTier: 2 }).cooldownRemaining, 0);
assert.equal(orchestrator.getAdaptiveRecommendation({ currentTier: 2 }).action, "recommend-reduce-load");
assert.equal(orchestrator.commitAdaptiveDecision("hold").accepted, false);

orchestrator.reset();
for (let i = 0; i < 6; i += 1) {
  orchestrator.observeFrame({ frameCostMs: 12, targetFrameMs: 33.3 });
}
const recovery = orchestrator.getAdaptiveRecommendation({ currentTier: 2 });
assert.equal(recovery.action, "recommend-one-tier-recovery");
assert.equal(recovery.reason, "sustained-frame-budget-headroom");

const lowPowerFloor = orchestrator.getAdaptiveRecommendation({ lowPower: true, currentTier: 1 });
assert.equal(lowPowerFloor.action, "hold");
assert.equal(lowPowerFloor.reason, "already-at-minimum-quality-tier");

const noAutoSwitch = orchestrator.evaluate({
  lowPower: false,
  currentQualityTier: 2,
  targetFrameMs: 33.3,
  frameCostMs: 12,
  temporal: { enabled: false }
});
assert.equal(noAutoSwitch.adaptiveMemory.action, "recommend-one-tier-recovery");
assert.equal(noAutoSwitch.performanceMode, "balanced");

orchestrator.observeFrame({ frameCostMs: -1, targetFrameMs: 33.3 });
orchestrator.observeFrame({ frameCostMs: 12, targetFrameMs: 0 });
assert.equal(orchestrator.getMemoryStatus().sampleCount, 6);

const bounded = new NOXNeuralCameraOrchestrator({ historySize: 6 });
for (let i = 0; i < 20; i += 1) {
  bounded.observeFrame({ frameCostMs: 10 + i, targetFrameMs: 33.3 });
}
assert.equal(bounded.getMemoryStatus().sampleCount, 6);
assert.equal(bounded.getMemoryStatus().historyLimit, 6);

bounded.reset();
assert.equal(bounded.getMemoryStatus().sampleCount, 0);
assert.equal(bounded.getAdaptiveRecommendation().reason, "insufficient-measured-frames");
console.log("NOX Neural Camera Orchestrator deterministic tests passed");
