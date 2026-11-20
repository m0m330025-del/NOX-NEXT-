import assert from "node:assert/strict";
import { NOXEngineOrchestrationPlanner } from "../core/nox-engine-orchestration-planner.js";

const planner = new NOXEngineOrchestrationPlanner();
const inventory = [
  { id: "flow", name: "Flow", registered: true, enabled: true, statusAvailable: true, capabilities: ["sparse-motion-vectors"], priority: 1 },
  { id: "motion", name: "Motion", registered: true, enabled: true, statusAvailable: true, capabilities: ["global-motion-consensus"], priority: 2 },
  { id: "align", name: "Align", registered: true, enabled: true, statusAvailable: true, capabilities: ["global-translation-alignment"], priority: 3 },
  { id: "fusion", name: "Fusion", registered: true, enabled: true, statusAvailable: true, capabilities: ["confidence-gated-frame-fusion"], priority: 4 },
  { id: "new-engine", name: "Late engine", registered: true, enabled: null, statusAvailable: false, capabilities: ["scene-tone"], estimatedCostMs: 1 },
  { id: "unrelated", registered: true, enabled: true, statusAvailable: true, capabilities: ["depth-map"] },
  { id: "not-registered", registered: false, enabled: true, capabilities: ["scene-tone"] }
];
const evidence = [
  { capability: "sparse-motion-vectors", available: true, confidence: 0.9, reason: "fresh-flow" },
  { capability: "global-motion-consensus", available: true, confidence: 0.8, reason: "dominant-motion" },
  { capability: "global-translation-alignment", available: true, confidence: 0.8, reason: "aligned-history" },
  { capability: "confidence-gated-frame-fusion", available: true, confidence: 0.75, reason: "fusion-gates-passed" },
  { capability: "scene-tone", available: true, confidence: 0.8, reason: "scene-measured" },
  { capability: "depth-map", available: false, confidence: 0, reason: "depth-not-measured" }
];
const plan = planner.evaluate({ registeredEngines: inventory, capabilityEvidence: evidence });
assert.equal(plan.status, "recommendation-ready");
assert.deepEqual(plan.steps.map(item => item.engine), ["flow", "new-engine", "motion", "align", "fusion"]);
assert.equal(plan.executionPerformed, false);
assert.equal(plan.decisions.find(item => item.engine === "new-engine").reason, "capability-supported-status-unknown-plan-only");

const missing = planner.evaluate({
  registeredEngines: inventory,
  capabilityEvidence: evidence.filter(item => item.capability !== "global-motion-consensus")
});
assert.equal(missing.decisions.find(item => item.engine === "motion").reason, "capability-evidence-unavailable");
assert.equal(missing.steps.some(item => item.engine === "fusion"), false);

const conflict = planner.evaluate({
  registeredEngines: [
    { id: "a", registered: true, enabled: true, capabilities: ["scene-tone"], conflictsWith: ["b"] },
    { id: "b", registered: true, enabled: true, capabilities: ["scene-tone"] }
  ],
  capabilityEvidence: [{ capability: "scene-tone", available: true, confidence: 0.9 }]
});
assert.equal(conflict.selectedEngineCount, 1);
assert.equal(conflict.decisions.find(item => item.engine === "b").reason, "engine-conflict-with:a");

const disabled = planner.evaluate({
  registeredEngines: [{ id: "off", registered: true, enabled: false, capabilities: ["scene-tone"] }],
  capabilityEvidence: [{ capability: "scene-tone", available: true, confidence: 1 }]
});
assert.equal(disabled.decisions[0].reason, "engine-disabled");

const lowConfidence = planner.evaluate({
  registeredEngines: [{ id: "weak", registered: true, enabled: true, capabilities: ["scene-tone"] }],
  capabilityEvidence: [{ capability: "scene-tone", available: true, confidence: 0.05 }]
});
assert.equal(lowConfidence.selectedEngineCount, 0);
assert.equal(lowConfidence.decisions[0].reason, "capability-evidence-unavailable");

const overloaded = planner.evaluate({
  registeredEngines: [
    { id: "known-cost", registered: true, enabled: true, capabilities: ["scene-tone"], estimatedCostMs: 2 },
    { id: "unknown-cost", registered: true, enabled: true, capabilities: ["scene-tone"] }
  ],
  capabilityEvidence: [{ capability: "scene-tone", available: true, confidence: 0.9 }],
  lowPower: true, performanceMode: "conserve", frameCostMs: 30, targetFrameMs: 33
});
assert.equal(overloaded.decisions.find(item => item.engine === "known-cost").action, "recommend");
assert.equal(overloaded.decisions.find(item => item.engine === "unknown-cost").reason, "cost-unknown-under-performance-constraint");

const overBudget = planner.evaluate({
  registeredEngines: [{ id: "too-costly", registered: true, enabled: true, capabilities: ["scene-tone"], estimatedCostMs: 5 }],
  capabilityEvidence: [{ capability: "scene-tone", available: true, confidence: 0.9 }],
  lowPower: true, performanceMode: "conserve", frameCostMs: 31, targetFrameMs: 33
});
assert.equal(overBudget.decisions[0].reason, "estimated-cost-exceeds-remaining-frame-budget");

planner.reset();
assert.equal(planner.getPlan().status, "no-evaluation");
console.log("NOX Engine Orchestration Planner deterministic tests passed");
