import assert from "node:assert/strict";
import { buildNOXFaceDigitalTwinDiagnostic } from "../core/nox-face-digital-twin-diagnostics.js";

const points = [
  { index: 10, x: 0.1, y: 0.1 },
  { index: 20, x: 0.9, y: 0.1 },
  { index: 30, x: 0.5, y: 0.9 }
];
const analysis = {
  state: "complete",
  source: "mediapipe-face-landmarker-478",
  width: 256,
  height: 192,
  landmarkCount: 478,
  regions: {
    lips: {
      points,
      edges: [[10, 20], [20, 30], [30, 10]],
      source: "mediapipe-official-face-connections"
    }
  }
};
const report = buildNOXFaceDigitalTwinDiagnostic(analysis);
assert.equal(report.state, "research-report");
assert.equal(report.compositorEligible, false);
assert.equal(report.topology.regions.lips.metrics.triangleCount, 1);
assert.equal(report.uncertainty.regions.lips.confidence, null);
assert.ok(report.uncertainty.regions.lips.unknownEvidence.includes("occlusion-not-assessed"));
assert.ok(report.uncertainty.regions.lips.unknownEvidence.includes("temporal-stability-not-assessed"));
assert.equal(report.evidence.regions.lips.compositorEligible, false);
assert.equal(buildNOXFaceDigitalTwinDiagnostic({ state: "unavailable" }).state, "unavailable");
console.log("NOX Face Digital Twin diagnostics integration tests passed");
