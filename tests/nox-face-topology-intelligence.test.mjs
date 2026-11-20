import assert from "node:assert/strict";
import { NOXFaceTopologyIntelligence } from "../core/nox-face-topology-intelligence.mjs";
const points=[{x:.1,y:.1},{x:.9,y:.1},{x:.5,y:.9},{x:.2,y:.2},{x:.8,y:.8}];
const engine=new NOXFaceTopologyIntelligence();
const valid=engine.analyze({landmarks:points,connections:{tessellation:[
 {start:0,end:1},{start:1,end:2},{start:2,end:0},{start:0,end:1}
]}});
assert.equal(valid.state,"partial");
assert.equal(valid.metrics.triangleCount,1);
assert.equal(valid.metrics.duplicateEdgeCount,1);
assert.ok(valid.warnings.includes("unused-landmark-points"));
const disconnected=engine.analyze({landmarks:points.slice(0,3),connections:{tessellation:[
 {start:0,end:1},{start:1,end:2}
]}});
assert.ok(disconnected.warnings.includes("no-reconstructable-triangles"));
const bad=engine.analyze({landmarks:points,connections:{tessellation:[{start:0,end:99}]}});
assert.equal(bad.state,"unavailable");
assert.equal(bad.reason,"invalid-tessellation-edge");
const invalid=engine.analyze({landmarks:[{x:2,y:.5},{x:.5,y:.5},{x:.4,y:.4}],connections:{tessellation:[]}});
assert.equal(invalid.reason,"invalid-landmark-array");
console.log("NOX Face Topology Intelligence tests passed");
