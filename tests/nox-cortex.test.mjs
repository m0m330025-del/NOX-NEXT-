import assert from "node:assert/strict";
import { NOXCortex, createNOXCortex } from "../core/nox-cortex.js";

const cortex = createNOXCortex();
const beauty = cortex.plan({
  faceRequested: true,
  landmarksRequested: true,
  maskRequested: true,
  makeupRequested: true,
  filterSelected: true
}, { mode: "quality" });
const ids = beauty.engines.map(engine => engine.id);
assert.ok(ids.indexOf("face-detection") < ids.indexOf("face-landmarks"));
assert.ok(ids.indexOf("face-landmarks") < ids.indexOf("facial-mask-builder"));
assert.ok(ids.indexOf("facial-mask-builder") < ids.indexOf("makeup-rendering"));
assert.ok(ids.includes("filter-render"));
assert.equal(beauty.execution, "not-started");

const motion = cortex.plan({ motion: true, temporalRequested: true, stabilization: true }, { mode: "lite" });
assert.ok(motion.engines.some(engine => engine.id === "optical-flow"));
assert.ok(motion.engines.length <= 3);
assert.ok(motion.totalCost <= 3);

cortex.setEngineEnabled("face-detection", false);
const blocked = cortex.plan({ faceRequested: true, landmarksRequested: true, maskRequested: true });
assert.ok(!blocked.engines.some(engine => ["face-landmarks", "facial-mask-builder", "makeup-rendering"].includes(engine.id)));
assert.ok(blocked.rejected.some(item => item.reason === "dependency-unavailable"));

const custom = new NOXCortex({ engines: [
  { id: "a", cost: 1, when: context => context.useA },
  { id: "b", cost: 1, requires: ["a"], when: context => context.useB }
] });
assert.deepEqual(custom.plan({ useB: true }).engines.map(engine => engine.id), ["a", "b"]);
assert.throws(() => custom.registerEngine({ id: "a", cost: 1 }), /duplicate-engine-id/);
assert.throws(() => custom.setMode("turbo"), /unsupported-cortex-mode/);
assert.equal(custom.recordOutcome("b", { durationMs: 8, success: true }), true);
assert.equal(custom.getStatus().telemetry.b.averageDurationMs, 8);
assert.equal(custom.recordOutcome("missing", { durationMs: 2 }), false);

const cyclic = new NOXCortex({ engines: [
  { id: "cycle-a", cost: 1, requires: ["cycle-b"], when: context => context.useCycle },
  { id: "cycle-b", cost: 1, requires: ["cycle-a"], when: context => context.useCycle }
] });
const cyclePlan = cyclic.plan({ useCycle: true });
assert.equal(cyclePlan.engines.length, 0);
assert.ok(cyclePlan.rejected.some(item => item.reason === "dependency-cycle"));

const budget = cortex.plan({ lowLight: true, detailRecovery: true, photonFusion: true, waveMatter: true }, { mode: "lite" });
assert.ok(budget.totalCost <= 3);
assert.ok(budget.engines.length <= 3);
console.log("NOX CORTEX orchestration tests passed");
