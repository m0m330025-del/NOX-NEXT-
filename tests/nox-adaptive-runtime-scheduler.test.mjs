import assert from "node:assert/strict";
import { NOXAdaptiveRuntimeScheduler } from "../core/nox-adaptive-runtime-scheduler.js";

const scheduler = new NOXAdaptiveRuntimeScheduler();
const plan = {
  state: "planned",
  engines: [
    { id: "optical-flow", requires: [], conflictsWith: [] },
    { id: "temporal-alignment", requires: ["optical-flow"], conflictsWith: [] },
    { id: "temporal-fusion", requires: ["temporal-alignment"], conflictsWith: [] }
  ]
};
const snapshot = [
  { id: "optical-flow", connected: true, enabled: true, state: "idle", measuredP95Ms: 3, estimatedCostMs: 3 },
  { id: "temporal-alignment", connected: true, enabled: true, state: "idle", measuredP95Ms: 2, estimatedCostMs: 2 },
  { id: "temporal-fusion", connected: true, enabled: true, state: "idle", measuredP95Ms: 4, estimatedCostMs: 4 }
];

const balanced = scheduler.evaluate({
  cortexPlan: plan, runtimeSnapshot: snapshot,
  targetFrameMs: 33.33, frameCostMs: 8,
  brainRecommendedIds: ["optical-flow", "temporal-alignment"]
});
assert.equal(balanced.state, "recommendation-ready");
assert.deepEqual(balanced.eligibleEngineIds, ["optical-flow", "temporal-alignment", "temporal-fusion"]);
assert.equal(balanced.estimatedTotalMs, 9);
assert.equal(balanced.availableBudgetMs, 24.08);
assert.equal(balanced.steps[0].brainRecommended, true);
assert.equal(balanced.executionPerformed, false);

const warmup = scheduler.evaluate({
  cortexPlan: plan,
  runtimeSnapshot: snapshot.map(item => ({ ...item, measuredP95Ms: null })),
  targetFrameMs: 33.33,
  frameCostMs: 5
});
assert.equal(warmup.eligibleCount, 0);
assert.ok(warmup.rejected.every(item => item.reason === "measured-p95-not-available"));
assert.equal(warmup.steps[1].reason, "dependency-not-runtime-eligible");

const disabled = scheduler.evaluate({
  cortexPlan: plan,
  runtimeSnapshot: snapshot.map(item => item.id === "optical-flow" ? { ...item, enabled: false } : item),
  targetFrameMs: 33.33,
  frameCostMs: 5
});
assert.equal(disabled.steps[0].reason, "adapter-disabled");
assert.ok(disabled.rejected.some(item => item.id === "temporal-alignment" && item.reason === "dependency-not-runtime-eligible"));

const lowPower = scheduler.evaluate({
  cortexPlan: { state: "planned", engines: [{ id: "optical-flow", requires: [] }] },
  runtimeSnapshot: snapshot,
  targetFrameMs: 18,
  frameCostMs: 12,
  lowPower: true
});
assert.equal(lowPower.availableBudgetMs, 3.5);
assert.equal(lowPower.steps[0].reason, "measured-p95-exceeds-remaining-frame-budget");

const missingAdapter = scheduler.evaluate({
  cortexPlan: { state: "planned", engines: [{ id: "unwired-engine", requires: [] }] },
  runtimeSnapshot: snapshot,
  targetFrameMs: 30
});
assert.equal(missingAdapter.steps[0].reason, "adapter-not-connected");

const conflict = scheduler.evaluate({
  cortexPlan: {
    state: "planned",
    engines: [
      { id: "first", requires: [], conflictsWith: ["second"] },
      { id: "second", requires: [], conflictsWith: [] }
    ]
  },
  runtimeSnapshot: [
    { id: "first", connected: true, enabled: true, state: "idle", measuredP95Ms: 1 },
    { id: "second", connected: true, enabled: true, state: "idle", measuredP95Ms: 1 }
  ],
  targetFrameMs: 30
});
assert.equal(conflict.steps[1].reason, "runtime-engine-conflict");

scheduler.reset();
assert.equal(scheduler.getSchedule().state, "no-evaluation");
assert.throws(() => scheduler.evaluate({ cortexPlan: null }), /valid-cortex-plan-required/);
console.log("NOX Adaptive Runtime Scheduler tests passed");
