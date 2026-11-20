/**
 * NOX Face Topology Intelligence.
 * Audits supplied landmark mesh topology without inventing points or faces.
 */
const MAX_EDGES = 20_000;
const MAX_DEGREE = 64;
const MAX_TRIANGLES = 50_000;
function validPoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}
export class NOXFaceTopologyIntelligence {
  analyze({ landmarks, connections } = {}) {
    const unavailable = reason => ({ state:"unavailable", reason, metrics:null, warnings:["topology-not-audited"] });
    if (!Array.isArray(landmarks) || landmarks.length < 3 || landmarks.length > 10_000 ||
        landmarks.some(point => !validPoint(point))) return unavailable("invalid-landmark-array");
    const edges = connections?.tessellation;
    if (!Array.isArray(edges) || edges.length < 1 || edges.length > MAX_EDGES)
      return unavailable("invalid-tessellation-edge-count");
    const adjacency = new Map(), seen = new Set();
    let duplicateEdges = 0;
    for (const edge of edges) {
      const a=Number(edge?.start), b=Number(edge?.end);
      if (!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=landmarks.length||b>=landmarks.length||a===b)
        return unavailable("invalid-tessellation-edge");
      const lo=Math.min(a,b), hi=Math.max(a,b), key=lo+":"+hi;
      if (seen.has(key)) { duplicateEdges+=1; continue; }
      seen.add(key);
      if (!adjacency.has(lo)) adjacency.set(lo,new Set());
      if (!adjacency.has(hi)) adjacency.set(hi,new Set());
      adjacency.get(lo).add(hi); adjacency.get(hi).add(lo);
    }
    const maxDegree=Math.max(0,...[...adjacency.values()].map(set=>set.size));
    if (maxDegree>MAX_DEGREE) return unavailable("vertex-degree-limit-exceeded");
    const visited=new Set(); let components=0;
    for (const start of adjacency.keys()) {
      if (visited.has(start)) continue;
      components+=1; const stack=[start]; visited.add(start);
      while (stack.length) for (const next of adjacency.get(stack.pop()))
        if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
    let triangleCount=0;
    for (const [a,neighbors] of adjacency) {
      const ordered=[...neighbors].filter(value=>value>a).sort((x,y)=>x-y);
      for (let i=0;i<ordered.length;i+=1) for (let j=i+1;j<ordered.length;j+=1)
        if (adjacency.get(ordered[i])?.has(ordered[j])) {
          triangleCount+=1;
          if (triangleCount>MAX_TRIANGLES) return unavailable("triangle-limit-exceeded");
        }
    }
    const warnings=[];
    if (duplicateEdges) warnings.push("duplicate-edges-ignored");
    if (components>1) warnings.push("disconnected-mesh-components");
    if (visited.size<landmarks.length) warnings.push("unused-landmark-points");
    if (!triangleCount) warnings.push("no-reconstructable-triangles");
    return { state:warnings.length?"partial":"complete",
      source:"supplied-landmarks-and-tessellation-only",
      metrics:{landmarkCount:landmarks.length,usedVertexCount:visited.size,edgeCount:seen.size,
        duplicateEdgeCount:duplicateEdges,componentCount:components,maxVertexDegree:maxDegree,triangleCount},
      warnings };
  }
}
