import assert from "node:assert/strict";
import { NOXMultiEngineIntelligenceBrain } from "../core/nox-multi-engine-intelligence-brain.js";

const brain = new NOXMultiEngineIntelligenceBrain();
const good = {
  lowPower: false, targetFrameMs: 33.3, frameCostMs: 12,
  opticalFlow: { enabled: true, vectorCount: 18, confidence: 0.72, ageMs: 80 },
  motion: { accepted: true, confidence: 0.8, backgroundRatio: 0.75 },
  alignment: { validSlots: 3, lastAccepted: { confidence: 0.82 } },
  temporal: { enabled: true }
};
const ready = brain.evaluate(good);
assert.equal(ready.status, "coordinated-evidence-ready");
assert.deepEqual(ready.pipeline, ["optical-flow", "motion-separation", "temporal-alignment", "temporal-fusion"]);
assert.equal(ready.decisions.find(x => x.engine === "temporal-fusion").action, "allow-evidence-gated-fusion");

const lowPower = brain.evaluate({ ...good, lowPower: true, frameCostMs: 44 });
assert.equal(lowPower.performanceMode, "conserve");
assert.equal(lowPower.performanceReason, "low-power-device-over-budget");
assert.equal(lowPower.decisions.find(x => x.engine === "quality-governor").action, "recommend-lower-cost-profile");

const stale = brain.evaluate({ ...good, opticalFlow: { ...good.opticalFlow, ageMs: 900 } });
assert.equal(stale.status, "live-frame-protected");
assert.equal(stale.pipeline.length, 0);
assert.equal(stale.decisions.find(x => x.engine === "optical-flow").reason, "flow-sample-stale-or-disabled");

const ambiguous = brain.evaluate({ ...good, motion: { accepted: false, reason: "ambiguous-motion-populations" } });
assert.equal(ambiguous.decisions.find(x => x.engine === "temporal-fusion").action, "protect-live-frame");

const noData = brain.evaluate({ temporal: { enabled: true }, opticalFlow: { enabled: true } });
assert.equal(noData.performanceMode, "unknown");
assert.equal(noData.status, "live-frame-protected");
assert.ok(noData.decisions.some(x => x.reason === "flow-age-unavailable"));

const missingAlignment = brain.evaluate({ ...good, alignment: { validSlots: 0, lastAccepted: null } });
assert.equal(missingAlignment.decisions.find(x => x.engine === "temporal-alignment").reason, "no-valid-alignment-slots");

const disabled = brain.evaluate({ ...good, temporal: { enabled: false } });
assert.equal(disabled.decisions.find(x => x.engine === "temporal-fusion").action, "inactive");

brain.reset();
assert.equal(brain.getPlan().status, "no-evaluation");
console.log("NOX Multi-Engine Intelligence Brain deterministic tests passed");
