import { NOXFaceDigitalTwin } from "./nox-face-research-suite.js";
import { NOXFaceTopologyIntelligence } from "./nox-face-topology-intelligence.js";

/**
 * Builds a read-only research report from a real Face Landmarks Engine result.
 * It deliberately does not infer occlusion or temporal stability from one frame.
 */
export function buildNOXFaceDigitalTwinDiagnostic(analysis) {
  if (!analysis || !["complete", "partial"].includes(analysis.state) ||
      !analysis.regions || typeof analysis.regions !== "object") {
    return { state: "unavailable", reason: "face-landmarks-analysis-not-ready",
      compositorEligible: false };
  }

  const topologyEngine = new NOXFaceTopologyIntelligence();
  const regions = {};
  const topologyByRegion = {};

  for (const [name, sourceRegion] of Object.entries(analysis.regions)) {
    if (!Array.isArray(sourceRegion?.points) || !Array.isArray(sourceRegion?.edges)) continue;
    const localIndex = new Map(sourceRegion.points.map((point, index) => [point.index, index]));
    const points = sourceRegion.points.map(({ x, y }) => ({ x, y }));
    const edges = sourceRegion.edges
      .filter(edge => Array.isArray(edge) && localIndex.has(edge[0]) && localIndex.has(edge[1]))
      .map(([start, end]) => ({ start: localIndex.get(start), end: localIndex.get(end) }));

    regions[name] = { points, edges, source: sourceRegion.source || analysis.source || null };
    topologyByRegion[name] = topologyEngine.analyze({
      landmarks: points,
      connections: { tessellation: edges }
    });
  }

  const topologyStates = Object.values(topologyByRegion);
  const topology = {
    state: !topologyStates.length || topologyStates.every(item => item.state === "unavailable")
      ? "unavailable"
      : topologyStates.some(item => item.state !== "complete") ? "partial" : "complete",
    source: "per-region-audit-of-supplied-mediapipe-connections",
    regions: topologyByRegion,
    compositorEligible: false
  };
  const regionEvidence = Object.fromEntries(Object.entries(regions).map(([name, region]) => [
    name,
    {
      source: region.source,
      topologyValid: topologyByRegion[name]?.state !== "unavailable"
    }
  ]));

  const twin = new NOXFaceDigitalTwin();
  const report = twin.analyze({ regions, topology, regionEvidence });
  return {
    ...report,
    source: "live-face-landmarks-preview-snapshot",
    frameSize: { width: analysis.width, height: analysis.height },
    landmarkCount: analysis.landmarkCount,
    topology: { ...report.topology, regions: topologyByRegion },
    compositorEligible: false,
    limitations: [
      ...report.limitations,
      "occlusion was not assessed from this single snapshot",
      "temporal stability requires consecutive tracked frames",
      "this report is diagnostic only and is not connected to makeup rendering"
    ]
  };
}
