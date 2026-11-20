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
const runtimeAfterSuccess = host.getRuntimeSnapshot()[0];
assert.equal(runtimeAfterSuccess.connected, true);
assert.equal(runtimeAfterSuccess.enabled, true);
assert.equal(runtimeAfterSuccess.planned, true);
assert.equal(runtimeAfterSuccess.executed, true);
assert.equal(runtimeAfterSuccess.failed, false);
assert.equal(runtimeAfterSuccess.lastExecutionStatus, "success");
assert.equal(runtimeAfterSuccess.samples, 2);
assert.equal(runtimeAfterSuccess.measuredP95Ms, 3);


let resolveSuperseded;
const raceAdapter = new NOXDynamicEngineAdapter({
  id: "async-race-engine",
  instance: {},
  process: input => input.defer
    ? new Promise(resolve => { resolveSuperseded = resolve; })
    : Promise.resolve({ value: "new-run" })
});
const oldRun = raceAdapter.handle({ defer: true });
await Promise.resolve();
assert.equal(typeof resolveSuperseded, "function");
assert.deepEqual(await raceAdapter.handle({ defer: false }), { value: "new-run" });
assert.equal(raceAdapter.getStatus().state, "ready");
resolveSuperseded({ value: "stale-run" });
await assert.rejects(oldRun, /engine-superseded/);
assert.equal(raceAdapter.getStatus().state, "ready", "stale completion must not overwrite newer adapter state");
assert.equal(raceAdapter.getStatus().samples, 1, "stale completion must not enter performance history");
assert.equal(raceAdapter.getStatus().failures, 0, "superseded work is not an engine failure");

let resolveAborted;
const abortAdapter = new NOXDynamicEngineAdapter({
  id: "async-abort-engine",
  instance: {},
  process: () => new Promise(resolve => { resolveAborted = resolve; })
});
const abortController = new AbortController();
const abortedRun = abortAdapter.handle({}, { signal: abortController.signal });
await Promise.resolve();
abortController.abort();
assert.equal(abortAdapter.getStatus().state, "cancelled", "abort must release adapter state immediately even if inference is still pending");
resolveAborted({ value: "late-aborted-output" });
await assert.rejects(abortedRun, /engine-aborted/);
assert.equal(abortAdapter.getStatus().state, "cancelled");
assert.equal(abortAdapter.getStatus().samples, 0, "aborted output must not enter performance history");
assert.equal(abortAdapter.getStatus().failures, 0, "aborted work is not an engine failure");

host.setEnabled(adapter.id, false);
assert.equal(cortex.plan({ useCustomScene: true }).engines.length, 0);
host.setEnabled(adapter.id, true);
assert.equal(cortex.plan({ useCustomScene: true }).engines.length, 1);

const invalidInputRun = await cortex.execute(plan, { value: "not-a-number" }, host.getHandlers());
assert.equal(invalidInputRun.state, "completed-with-errors");
assert.equal(invalidInputRun.results[0].status, "failed");
assert.equal(adapter.getStatus().failures, 1);
assert.equal(adapter.getStatus().state, "failed");
const runtimeAfterFailure = host.getRuntimeSnapshot()[0];
assert.equal(runtimeAfterFailure.failed, true);
assert.equal(runtimeAfterFailure.executed, false);
assert.equal(runtimeAfterFailure.lastExecutionStatus, "failed");
assert.equal(runtimeAfterFailure.failureCount, 1);

assert.throws(() => host.register(adapter), /duplicate-adapter-id/);
assert.equal(unregister(), true);
assert.equal(cortex.engines.has(adapter.id), false);
assert.equal(registry.snapshot().length, 0);
assert.equal(unregister(), false);

const conflictCortex = new NOXCortex({ engines: [
  { id: "stable-pipeline", cost: 1, priority: 20, when: context => context.useStable === true }
] });
const conflictRegistry = new NOXEngineRegistry();
const conflictHost = new NOXDynamicEngineAdapterHost({ cortex: conflictCortex, registry: conflictRegistry });
const conflictAdapter = new NOXDynamicEngineAdapter({
  id: "custom-conflicting",
  when: context => context.useCustom === true,
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


const legacyCortex = new NOXCortex();
const legacyRegistry = new NOXEngineRegistry();
const legacyInstance = { getStatus: () => ({ enabled: true, legacy: true }) };
legacyRegistry.register({
  id: "optical-flow", name: "Legacy Optical Flow", category: "motion",
  instance: legacyInstance, capabilities: ["legacy-flow"]
});
const previousCortexDescriptor = legacyCortex.engines.get("optical-flow");
const replacement = new NOXDynamicEngineAdapter({
  id: "optical-flow", name: "Adapted Optical Flow", category: "motion",
  instance: {}, process: input => input, capabilities: ["sparse-motion-vectors"]
});
replacement.attach({ cortex: legacyCortex, registry: legacyRegistry });
assert.notEqual(legacyCortex.engines.get("optical-flow"), previousCortexDescriptor);
assert.equal(legacyRegistry.entries.get("optical-flow").instance, replacement.instance);
assert.equal(legacyRegistry.snapshot()[0].name, "Adapted Optical Flow");
replacement.detach();
assert.equal(legacyCortex.engines.get("optical-flow").name, previousCortexDescriptor.name);
assert.equal(legacyRegistry.entries.get("optical-flow").instance, legacyInstance);
assert.equal(legacyRegistry.snapshot()[0].name, "Legacy Optical Flow");


let syncTick = 0;
const syncCortex = new NOXCortex({ engines: [] });
const syncRegistry = new NOXEngineRegistry();
const syncHost = new NOXDynamicEngineAdapterHost({ cortex: syncCortex, registry: syncRegistry });
const syncInstance = { total: 0 };
const syncAdapter = new NOXDynamicEngineAdapter({
  id: "sync-frame-policy",
  instance: syncInstance,
  processSync: input => {
    syncInstance.total += input.delta;
    return { total: syncInstance.total, sequence: input.sequence };
  },
  capabilities: ["sync-frame-policy"],
  clock: () => syncTick += 2,
  historyLimit: 2,
  minSamplesForMeasuredCost: 2
});
syncHost.register(syncAdapter);
assert.deepEqual(syncHost.runSync("sync-frame-policy", { delta: 3, sequence: 1 }), { total: 3, sequence: 1 });
assert.deepEqual(syncHost.runSync("sync-frame-policy", { delta: 4, sequence: 2 }), { total: 7, sequence: 2 });
assert.equal(syncAdapter.getStatus().samples, 2);
assert.equal(syncAdapter.getStatus().measuredP95Ms, 2);
assert.equal(syncRegistry.snapshot()[0].estimatedCostMs, 2);
assert.throws(() => syncHost.runSync("sync-frame-policy", { delta: 1, sequence: 3 }, { signal: { aborted: true } }), /engine-aborted/);
assert.throws(() => new NOXDynamicEngineAdapter({
  id: "bad-sync-return", instance: {}, processSync: () => Promise.resolve("not-sync")
}).handleSync({}), /sync-engine-returned-promise/);
syncHost.setEnabled("sync-frame-policy", false);
assert.throws(() => syncHost.runSync("sync-frame-policy", { delta: 1 }), /engine-disabled/);
syncHost.clear();

assert.throws(() => new NOXDynamicEngineAdapter({ id: "missing-process", instance: {} }), /process-required/);
assert.throws(() => new NOXDynamicEngineAdapter({ id: "bad id", instance: {}, process: () => ({}) }), /invalid-engine-adapter-id/);
console.log("NOX Dynamic Engine Adapter contract tests passed");
