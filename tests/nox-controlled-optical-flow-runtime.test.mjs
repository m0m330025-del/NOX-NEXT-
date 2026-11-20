import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NOXCortex } from "../core/nox-cortex.js";
import { NOXAdaptiveRuntimeScheduler } from "../core/nox-adaptive-runtime-scheduler.js";
import { NOXDynamicEngineAdapter, NOXDynamicEngineAdapterHost } from "../core/nox-dynamic-engine-adapter.js";
import { NOXSparseOpticalFlowEngine } from "../core/nox-optical-flow-engine.js";
import { NOXOpticalFlowRecoveryGate } from "../core/nox-optical-flow-recovery-gate.js";

const cameraSource = readFileSync(new URL("../core/camera.js", import.meta.url), "utf8");
for (const token of [
  "opticalFlowLastSampleAt",
  "flowRuntime.samples >= 3",
  "Number.isFinite(flowRuntime.measuredP95Ms)",
  "noxAdaptiveRuntimeScheduler.evaluate({",
  "if (!cameraPipelineSchedule.eligibleEngineIds.includes(\"optical-flow\"))",
  "opticalFlowRuntimeGate = \"held-frame-cost-unavailable\"",
  "opticalFlowRuntimeGate = warmupComplete ? \"executed-controlled\" : \"executed-warmup\"",
  "opticalFlowRecoveryGate.evaluate(true)",
  "opticalFlowRecoveryGate.evaluate(false)",
  "recovering-\" + recovery.healthyStreak"
  "cameraPipelineBudgetPlan",
  "cameraPipelineWarmupComplete",
  "runPipelineEngine(\"predictive-camera-intelligence\")",
  "runPipelineEngine(\"smart-motion-separation\")",
  "runPipelineEngine(\"temporal-alignment\")",
  "runtimeSnapshot,"
]) {
  assert.ok(cameraSource.includes(token), "camera controlled-runtime integration missing: " + token);
}
assert.ok(
  cameraSource.indexOf("noxAdaptiveRuntimeScheduler.evaluate({", cameraSource.indexOf("async function estimateOpticalFlow")) <
    cameraSource.indexOf("const execution = await cortex.execute(", cameraSource.indexOf("async function estimateOpticalFlow")),
  "runtime budget gate must run before the existing CORTEX execution"
);

const recoveryGate = new NOXOpticalFlowRecoveryGate({ requiredConsecutive: 3 });
assert.equal(recoveryGate.evaluate(true).allowed, true, "initial eligible operation should not be delayed");
assert.equal(recoveryGate.evaluate(false).allowed, false, "an overload must block the next run");
assert.equal(recoveryGate.evaluate(true).allowed, false, "first healthy evaluation must remain in recovery");
assert.equal(recoveryGate.evaluate(true).allowed, false, "second healthy evaluation must remain in recovery");
const recovered = recoveryGate.evaluate(true);
assert.equal(recovered.allowed, true, "third consecutive healthy evaluation restores operation");
assert.equal(recovered.recovering, false);
assert.equal(recoveryGate.evaluate(false).healthyStreak, 0, "a renewed overload resets recovery progress");
assert.equal(recoveryGate.evaluate(true).allowed, false);
assert.equal(recoveryGate.evaluate(false).healthyStreak, 0, "an unstable recovery streak must restart");
recoveryGate.reset();
assert.equal(recoveryGate.evaluate(true).allowed, true, "reset starts a fresh session");

const width = 64;
const height = 48;
const previous = new Uint8Array(width * height);
let seed = 29;
for (let index = 0; index < previous.length; index += 1) {
  seed = (seed * 48271) % 2147483647;
  previous[index] = seed & 255;
}
const current = new Uint8Array(width * height);
for (let y = 0; y < height; y += 1) {
  for (let x = 1; x < width; x += 1) {
    current[y * width + x] = previous[y * width + x - 1];
  }
}
const input = { current, previous, width, height };
const options = { cellStep: 8, patchRadius: 1, searchRadius: 3 };

const referenceEngine = new NOXSparseOpticalFlowEngine();
const referenceOutput = referenceEngine.process(
  input.current, input.previous, input.width, input.height, options
);

let clockValue = 0;
const measuredClock = () => {
  clockValue += 1;
  return clockValue;
};
const cortex = new NOXCortex({ engines: [] });
const host = new NOXDynamicEngineAdapterHost({ cortex, registry: {
  register() { return () => {}; },
  replace() { return () => {}; }
} });
const adaptedEngine = new NOXSparseOpticalFlowEngine();
const adapter = new NOXDynamicEngineAdapter({
  id: "optical-flow",
  name: "Sparse Optical Flow",
  category: "motion",
  instance: adaptedEngine,
  cost: 2,
  priority: 75,
  capabilities: ["sparse-motion-vectors"],
  when: context => context.motion === true,
  process: (frame, { context }) => adaptedEngine.process(
    frame.current, frame.previous, frame.width, frame.height,
    { ...options, searchRadius: context.lowPower ? 2 : options.searchRadius }
  ),
  clock: measuredClock,
  minSamplesForMeasuredCost: 3
});
host.register(adapter);

const plan = cortex.plan({ motion: true }, {
  requested: ["optical-flow"],
  mode: "balanced"
});
assert.deepEqual(plan.engines.map(engine => engine.id), ["optical-flow"]);

let execution;
for (let sample = 0; sample < 3; sample += 1) {
  execution = await cortex.execute(plan, input, host.getHandlers(), {
    context: { lowPower: false }
  });
  assert.equal(execution.state, "completed");
}
assert.deepEqual(execution.output, referenceOutput,
  "CORTEX adapter output must exactly match the existing optical-flow engine output");

const runtime = host.getRuntimeSnapshot();
assert.equal(runtime[0].connected, true);
assert.equal(runtime[0].enabled, true);
assert.equal(runtime[0].samples, 3);
assert.equal(runtime[0].measuredP95Ms, 1);

const scheduler = new NOXAdaptiveRuntimeScheduler();
const eligible = scheduler.evaluate({
  cortexPlan: plan,
  runtimeSnapshot: runtime,
  targetFrameMs: 33.33,
  frameCostMs: 8,
  lowPower: false
});
assert.deepEqual(eligible.eligibleEngineIds, ["optical-flow"]);
assert.equal(eligible.executionPerformed, false,
  "scheduler evaluation must remain a decision and must not execute engines");

const overBudget = scheduler.evaluate({
  cortexPlan: plan,
  runtimeSnapshot: runtime,
  targetFrameMs: 18,
  frameCostMs: 16,
  lowPower: true
});
assert.deepEqual(overBudget.eligibleEngineIds, []);
assert.equal(overBudget.steps[0].reason, "measured-p95-exceeds-remaining-frame-budget");
assert.equal(overBudget.executionPerformed, false);

const coldRuntime = runtime.map(item => ({ ...item, measuredP95Ms: null }));
const cold = scheduler.evaluate({
  cortexPlan: plan,
  runtimeSnapshot: coldRuntime,
  targetFrameMs: 33.33,
  frameCostMs: 8
});
assert.deepEqual(cold.eligibleEngineIds, []);
assert.equal(cold.steps[0].reason, "measured-p95-not-available");

host.clear();
console.log("NOX Controlled Optical Flow Runtime Parity tests passed");
