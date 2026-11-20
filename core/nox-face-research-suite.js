/**
 * NOX Face Research Suite: uncertainty, temporal memory, occlusion evidence,
 * adaptive rasterization, region provenance, expression deltas, conservative
 * repair, and Digital Twin orchestration.
 *
 * All outputs describe supplied observations only. No hidden anatomy, missing
 * landmarks, calibrated confidence, or compositor authorization is fabricated.
 */
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
const clamp01 = value => Math.max(0, Math.min(1, value));
const unavailable = (reason, extra = {}) => ({ state:"unavailable", reason, ...extra });

export class NOXMaskUncertaintyEngine {
  analyze(regions = {}, evidence = {}) {
    const result = {};
    for (const [name, region] of Object.entries(regions)) {
      const checks = evidence[name] || {};
      const missing = [];
      if (!Array.isArray(region?.points) || region.points.length < 3) missing.push("region-points-missing");
      if (!Array.isArray(region?.edges) || region.edges.length < 3) missing.push("region-edges-missing");
      if (!checks.source) missing.push("source-provenance-missing");
      if (checks.occluded === true) missing.push("occlusion-reported");
      if (checks.topologyValid === false) missing.push("topology-invalid");
      if (checks.temporalStable === false) missing.push("temporal-instability-reported");
      const unknown = [];
      if (checks.occluded === undefined) unknown.push("occlusion-not-assessed");
      if (checks.temporalStable === undefined) unknown.push("temporal-stability-not-assessed");
      result[name] = {
        state: missing.length ? "rejected" : (unknown.length ? "indeterminate" : "evidence-present"),
        uncertainty: "not-calibrated",
        missingEvidence: missing,
        unknownEvidence: unknown,
        confidence: null,
        compositorEligible: false
      };
    }
    return { state:Object.keys(result).length ? "partial" : "unavailable",
      regions:result, reason:"evidence-audit-not-a-probability-model" };
  }
}

export class NOXTemporalMaskMemory {
  constructor({ maxFrames = 4, maxPoints = 2000, maxDelta = 0.08 } = {}) {
    this.maxFrames = Math.max(2, Math.min(8, Math.floor(maxFrames)));
    this.maxPoints = Math.max(3, Math.min(5000, Math.floor(maxPoints)));
    this.maxDelta = clamp01(maxDelta);
    this.tracks = new Map();
  }
  update({ trackId, frameId, points } = {}) {
    if (trackId === undefined || trackId === null || !Number.isFinite(frameId) ||
        !Array.isArray(points) || points.length < 3 || points.length > this.maxPoints ||
        !points.every(finitePoint)) return unavailable("invalid-temporal-observation");
    const previous = this.tracks.get(trackId);
    if (previous && frameId <= previous.frameId) {
      this.tracks.delete(trackId);
      return unavailable("non-monotonic-frame-reset");
    }
    const discontinuity = previous && frameId !== previous.frameId + 1;
    if (discontinuity || (previous && previous.points.length !== points.length)) this.tracks.delete(trackId);
    const baseline = this.tracks.get(trackId);
    let meanDelta = null, maxDelta = null, stable = null;
    if (baseline) {
      const deltas = points.map((p, i) => Math.hypot(p.x-baseline.points[i].x,p.y-baseline.points[i].y));
      meanDelta = deltas.reduce((a,b)=>a+b,0)/deltas.length;
      maxDelta = Math.max(...deltas);
      stable = maxDelta <= this.maxDelta;
    }
    const frames = baseline ? baseline.frames + 1 : 1;
    this.tracks.set(trackId,{frameId,points:points.map(p=>({x:p.x,y:p.y})),frames});
    return { state:stable===null?"warming":(stable?"stable":"unstable"),
      trackId,frameId,frames,meanDelta,maxDelta,stable,
      reset:!!discontinuity, confidence:null };
  }
  reset(trackId) { if (trackId === undefined) this.tracks.clear(); else this.tracks.delete(trackId); }
}

export class NOXOcclusionIntelligence {
  analyze({ landmarks, visibility, occludedIndices = [], source } = {}) {
    if (!Array.isArray(landmarks) || landmarks.length < 3 ||
        !landmarks.every(finitePoint)) return unavailable("invalid-landmarks");
    if (!Array.isArray(visibility) && !Array.isArray(occludedIndices))
      return unavailable("occlusion-evidence-missing");
    const occluded = new Set(occludedIndices.filter(Number.isInteger));
    const hasVisibility = Array.isArray(visibility) && visibility.length === landmarks.length;
    if (hasVisibility) visibility.forEach((v,i)=>{ if (Number.isFinite(v) && v < 0.5) occluded.add(i); });
    const validIndices=[...occluded].filter(i=>i>=0&&i<landmarks.length);
    return { state: validIndices.length ? "partial" : (hasVisibility || (Array.isArray(occludedIndices) && occludedIndices.length > 0) ? "clear-observed" : "indeterminate"),
      source:source || "caller-supplied-occlusion-evidence",
      occludedPointIndices:validIndices,
      visiblePointCount:hasVisibility?visibility.filter(v=>Number.isFinite(v)&&v>=0.5).length:null,
      maskSuppressionRequired:validIndices.length>0,
      confidence:null,
      limitations:["landmark visibility is not semantic occluder classification","no hidden geometry is reconstructed"] };
  }
}

export class NOXAdaptiveMeshRasterizer {
  rasterize({ width, height, triangles, maxPixels = 262144, maxOperations = 2_000_000 } = {}) {
    if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
        width*height>maxPixels||!Array.isArray(triangles)||triangles.length>50000)
      return unavailable("raster-budget-or-input-invalid");
    if (!triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(finitePoint)))
      return unavailable("invalid-triangle-data");
    const data=new Uint8Array(width*height); let operations=0, pixelCount=0;
    for (const [a,b,c] of triangles) {
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x)*width));
      const maxX=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)*width));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y)*height));
      const maxY=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)*height));
      const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      if (Math.abs(area)<1e-12) continue;
      const cost=(maxX-minX+1)*(maxY-minY+1);
      if (operations+cost>maxOperations) return unavailable("raster-operation-budget-exceeded");
      for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
        operations++;
        const px=(x+0.5)/width, py=(y+0.5)/height;
        const w1=((b.x-px)*(c.y-py)-(b.y-py)*(c.x-px))/area;
        const w2=((c.x-px)*(a.y-py)-(c.y-py)*(a.x-px))/area;
        const w3=1-w1-w2;
        if(w1>=-1e-8&&w2>=-1e-8&&w3>=-1e-8) {
          const index=y*width+x;
          if(!data[index]) {data[index]=1;pixelCount++;}
        }
      }
    }
    return {state:"preview",width,height,data,pixelCount,operations,
      source:"supplied-triangle-rasterization",confidence:null,compositorEligible:false};
  }
}

export class NOXRegionEvidenceEngine {
  evaluate({ regions = {}, topology, masks = {}, occlusion, temporal } = {}) {
    const report={};
    for(const [name,region] of Object.entries(regions)) {
      const reasons=[];
      if(!region?.source) reasons.push("source-not-declared");
      if(!Array.isArray(region?.points)||region.points.length<3) reasons.push("insufficient-points");
      if(!Array.isArray(region?.edges)||region.edges.length<3) reasons.push("insufficient-edges");
      if(topology?.state==="unavailable") reasons.push("topology-audit-unavailable");
      if(occlusion?.maskSuppressionRequired) reasons.push("occlusion-suppression");
      if(temporal?.state==="unstable") reasons.push("temporal-instability");
      const mask=masks[name];
      if(mask && (!mask.source || mask.confidence!==null)) reasons.push("mask-provenance-or-confidence-contract-invalid");
      report[name]={state:reasons.length?"rejected":"evidence-recorded",
        evidenceSource:region?.source||null,pointCount:region?.points?.length||0,
        edgeCount:region?.edges?.length||0,reasons,
        compositorEligible:false};
    }
    return {state:Object.keys(report).length?"partial":"unavailable",regions:report,
      policy:"evidence-ledger-only; no compositor authorization"};
  }
}

export class NOXExpressionDeformationEngine {
  compare({ baseline, current, blendshapes = [] } = {}) {
    if(!Array.isArray(baseline)||!Array.isArray(current)||baseline.length<3||
      baseline.length!==current.length||!baseline.every(finitePoint)||!current.every(finitePoint))
      return unavailable("incompatible-expression-landmarks");
    const deltas=current.map((p,i)=>Math.hypot(p.x-baseline[i].x,p.y-baseline[i].y));
    const meanDelta=deltas.reduce((a,b)=>a+b,0)/deltas.length;
    const maxDelta=Math.max(...deltas);
    const expressionSignals=Array.isArray(blendshapes)
      ? blendshapes.filter(x=>x&&typeof x.categoryName==="string"&&Number.isFinite(x.score))
        .map(x=>({name:x.categoryName,score:clamp01(x.score)})) : [];
    return {state:"observed-delta",pointCount:current.length,meanDelta,maxDelta,
      expressionSignals,semantics:"raw-deformation-descriptor-not-anatomical-interpretation",
      confidence:null};
  }
}

export class NOXMaskSelfRepairLab {
  inspect({ landmarks, edges } = {}) {
    if(!Array.isArray(landmarks)||!landmarks.every(finitePoint)||!Array.isArray(edges))
      return unavailable("invalid-repair-input");
    const accepted=[], rejected=[], seen=new Set();
    for(const edge of edges) {
      const a=Number(edge?.start),b=Number(edge?.end);
      if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||
        a>=landmarks.length||b>=landmarks.length||a===b) {
        rejected.push({edge,reason:"invalid-edge"});continue;
      }
      const key=Math.min(a,b)+":"+Math.max(a,b);
      if(seen.has(key)) {rejected.push({edge,reason:"duplicate-edge"});continue;}
      seen.add(key);accepted.push({start:a,end:b});
    }
    return {state:rejected.length?"partial":"inspected",acceptedEdges:accepted,
      rejectedEdges:rejected,repairsApplied:0,
      policy:"conservative-inspection-only; no missing edge or point is synthesized"};
  }
}

export class NOXFaceDigitalTwin {
  constructor(options={}) {
    this.uncertainty=new NOXMaskUncertaintyEngine();
    this.temporal=new NOXTemporalMaskMemory(options.temporal);
    this.occlusion=new NOXOcclusionIntelligence();
    this.rasterizer=new NOXAdaptiveMeshRasterizer();
    this.evidence=new NOXRegionEvidenceEngine();
    this.expression=new NOXExpressionDeformationEngine();
    this.repair=new NOXMaskSelfRepairLab();
  }
  analyze(input={}) {
    const topology=input.topology||unavailable("topology-not-supplied");
    const temporal=input.temporalObservation?this.temporal.update(input.temporalObservation):unavailable("temporal-observation-not-supplied");
    const occlusion=input.occlusionObservation?this.occlusion.analyze(input.occlusionObservation):unavailable("occlusion-observation-not-supplied");
    const uncertainty=this.uncertainty.analyze(input.regions,input.regionEvidence);
    const evidence=this.evidence.evaluate({regions:input.regions,topology,occlusion,temporal,masks:input.masks});
    return {state:"research-report",topology,temporal,occlusion,uncertainty,evidence,
      compositorEligible:false,limitations:["no anatomical ground truth","no calibrated confidence",
        "no automatic hidden-region reconstruction","no makeup compositor integration"]};
  }
}
