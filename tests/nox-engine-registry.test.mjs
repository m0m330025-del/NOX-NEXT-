import assert from "node:assert/strict";
import { NOXEngineRegistry } from "../core/nox-engine-registry.js";

const registry = new NOXEngineRegistry();
const flow = { getStatus: () => ({ enabled: true, vectorCount: 12, confidence: 0.8, vectors: [{ x: 1 }] }) };
const unregister = registry.register({
  id: "optical-flow",
  name: "Sparse Optical Flow",
  category: "motion",
  instance: flow,
  capabilities: ["motion-vectors", "confidence"]
});
registry.register({
  id: "scene-intelligence",
  instance: { getStatus: () => { throw new Error("status-unavailable"); } }
});
registry.register({ id: "new-engine-added-later", instance: {} });

const snapshot = registry.snapshot();
assert.equal(snapshot.length, 3);
assert.equal(snapshot[0].statusAvailable, true);
assert.equal(snapshot[0].enabled, true);
assert.equal(snapshot[0].status.vectorCount, 12);
assert.equal("vectors" in snapshot[0].status, false);
assert.equal(snapshot[1].registered, true);
assert.equal(snapshot[1].statusAvailable, false);
assert.equal(snapshot[2].id, "new-engine-added-later");
unregister();
assert.equal(registry.size, 2);
registry.clear();
assert.equal(registry.snapshot().length, 0);
assert.throws(() => registry.register({ id: "bad id", instance: {} }), /invalid-engine-id/);
console.log("NOX Engine Registry deterministic tests passed");
