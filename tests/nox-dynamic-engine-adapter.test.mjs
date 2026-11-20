import assert from "node:assert/strict";
import { NOXCortex } from "../core/nox-cortex.js";
import { NOXEngineRegistry } from "../core/nox-engine-registry.js";
import {
  NOXDynamicEngineAdapter,
  NOXDynamicEngineAdapterHost,
  NOX_ENGINE_ADAPTER_CONTRACT_VERSION
} from "../core/nox-dynamic-engine-adapter.js";

let tick = 0;
const clock = () => {
  const value = tick;
  tick += 3;
  return value;
};
const cortex = new NOXCortex({ engines: [] });
const registry = new NOXEngineRegistry();
const host = new NOXDynamicEngineAdapterHost({ cortex, registry });
const implementation = { kind: "test-engine" };
const adapter = new NOXDynamicEngineAdapter({
  id: "custom-scene-engine",
  name: "Custom Scene Engine",
  category: "scene",
  instance: implementation,
  cost: 1,
  priority: 8,
  capabilities: ["scene-tone", "scene-contrast"],
  when: context => context.useCustomScene === true,
  process: async (input, context) => ({
    value: input.value + 1,
    trace: context.context.trace
  }),
  validateInput: input => Number.isFinite(input?.value),
  validateOutput: output => Number.isFinite(output?.value),
  clock,
  historyLimit: 2,
  minSamplesForMeasuredCost: 2
});
const unregister = host.register(adapter);
assert.equal(NOX_ENGINE_ADAPTER_CONTRACT_VERSION, 1);
assert.equal(cortex.engines.has(adapter.id), true);
assert.equal(registry.snapshot()[0].id, adapter.id);
assert.deepEqual(registry.snapshot()[0].capabilities, ["scene-tone", "scene-contrast"]);

const plan = cortex.plan({ useCustomScene: true });
assert.deepEqual(plan.engines.map(item => item.id), [adapter.id]);
assert.equal(plan.execution, "not-started");

const first = await cortex.execute(plan, { value: 4 }, host.getHandlers(), {
  context: { trace: "frame-a" }
});
assert.equal(first.state, "completed");
assert.deepEqual(first.output, { value: 5, trace: "frame-a" });
assert.equal(adapter.getStatus().samples, 1);
assert.equal(adapter.getStatus().estimatedCostMs, null);

const second = await cortex.execute(plan, { value: 9 }, host.getHandlers(), {
  context: { trace: "frame-b" }
});
assert.equal(second.output.value, 10);
assert.equal(adapter.getStatus().samples, 2);
assert.equal(adapter.getStatus().measuredP95Ms, 3);
assert.equal(registry.snapshot()[0].estimatedCostMs, 3);
assert.equal(cortex.getStatus().telemetry[adapter.id].samples, 2);

const third = await cortex.execute(plan, { value: 1 }, host.getHandlers());
assert.equal(third.output.value, 2);
assert.equal(adapter.getStatus().samples, 2, "adapter history remains bounded");
assert.equal(adapter.getStatus().failures, 0);

host.setEnabled(adapter.id, false);
assert.equal(cortex.plan({ useCustomScene: true }).engines.length, 0);
host.setEnabled(adapter.id, true);
assert.equal(cortex.plan({ useCustomScene: true }).engines.length, 1);

const invalidInputRun = await cortex.execute(plan, { value: "not-a-number" }, host.getHandlers());
assert.equal(invalidInputRun.state, "completed-with-errors");
assert.equal(invalidInputRun.results[0].status, "failed");
assert.equal(adapter.getStatus().failures, 1);
assert.equal(adapter.getStatus().state, "failed");

assert.throws(() => host.register(adapter), /duplicate-adapter-id/);
assert.equal(unregister(), true);
assert.equal(cortex.engines.has(adapter.id), false);
assert.equal(registry.snapshot().length, 0);
assert.equal(unregister(), false);

const conflictCortex = new NOXCortex({ engines: [
  { id: "stable-pipeline", cost: 1, priority: 20, when: context => context.useStable === true },
  { id: "custom-conflicting", cost: 1, priority: 10, when: context => context.useCustom === true }
] });
const conflictRegistry = new NOXEngineRegistry();
const conflictHost = new NOXDynamicEngineAdapterHost({ cortex: conflictCortex, registry: conflictRegistry });
const conflictAdapter = new NOXDynamicEngineAdapter({
  id: "custom-conflicting",
  instance: {},
  process: input => input,
  capabilities: ["custom-output"],
  conflictsWith: ["stable-pipeline"]
});
conflictHost.register(conflictAdapter);
const conflictPlan = conflictCortex.plan({ useStable: true, useCustom: true });
assert.deepEqual(conflictPlan.engines.map(item => item.id), ["stable-pipeline"]);
assert.ok(conflictPlan.rejected.some(item =>
  item.id === "custom-conflicting" && item.reason === "engine-conflict" && item.conflict === "stable-pipeline"
));
conflictHost.clear();

assert.throws(() => new NOXDynamicEngineAdapter({ id: "missing-process", instance: {} }), /process-required/);
assert.throws(() => new NOXDynamicEngineAdapter({ id: "bad id", instance: {}, process: () => ({}) }), /invalid-engine-adapter-id/);
console.log("NOX Dynamic Engine Adapter contract tests passed");
