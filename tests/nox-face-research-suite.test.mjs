import assert from "node:assert/strict";
import {
 NOXMaskUncertaintyEngine,NOXTemporalMaskMemory,NOXOcclusionIntelligence,
 NOXAdaptiveMeshRasterizer,NOXRegionEvidenceEngine,NOXExpressionDeformationEngine,
 NOXMaskSelfRepairLab,NOXFaceDigitalTwin
} from "../core/nox-face-research-suite.mjs";
const region={source:"mediapipe-official-face-connections",points:[{x:.1,y:.1},{x:.9,y:.1},{x:.5,y:.9}],edges:[[0,1],[1,2],[2,0]]};
const u=new NOXMaskUncertaintyEngine().analyze({lips:region},{lips:{source:"mediapipe",topologyValid:true,occluded:false,temporalStable:true}});
assert.equal(u.regions.lips.state,"evidence-present"); assert.equal(u.regions.lips.confidence,null);
const mem=new NOXTemporalMaskMemory();
assert.equal(mem.update({trackId:"a",frameId:1,points:region.points}).state,"warming");
assert.equal(mem.update({trackId:"a",frameId:2,points:region.points}).state,"stable");
assert.equal(mem.update({trackId:"a",frameId:4,points:region.points}).reset,true);
const occ=new NOXOcclusionIntelligence().analyze({landmarks:region.points,occludedIndices:[1]});
assert.equal(occ.maskSuppressionRequired,true);
const raster=new NOXAdaptiveMeshRasterizer().rasterize({width:16,height:16,triangles:[[region.points[0],region.points[1],region.points[2]]]});
assert.equal(raster.state,"preview"); assert.ok(raster.pixelCount>0);
assert.equal(new NOXAdaptiveMeshRasterizer().rasterize({width:1000,height:1000,triangles:[]}).state,"unavailable");
const ev=new NOXRegionEvidenceEngine().evaluate({regions:{lips:region},occlusion:occ});
assert.ok(ev.regions.lips.reasons.includes("occlusion-suppression"));
const deformation=new NOXExpressionDeformationEngine().compare({baseline:region.points,current:region.points.map(p=>({...p,x:p.x+.01}))});
assert.equal(deformation.state,"observed-delta"); assert.ok(deformation.meanDelta>0);
const repair=new NOXMaskSelfRepairLab().inspect({landmarks:region.points,edges:[{start:0,end:1},{start:1,end:0},{start:1,end:8}]});
assert.equal(repair.repairsApplied,0); assert.equal(repair.acceptedEdges.length,1); assert.equal(repair.rejectedEdges.length,2);
const twin=new NOXFaceDigitalTwin().analyze({regions:{lips:region},topology:{state:"complete"}});
assert.equal(twin.compositorEligible,false);
console.log("NOX Face Research Suite tests passed");
