/**
 * Converts genuine MediaPipe landmarks and official connection graphs into
 * validated semantic point/edge regions. No coordinates are invented.
 */
const REGION_KEYS = ["lips", "leftEye", "rightEye", "leftEyebrow", "rightEyebrow", "faceOval"];

export class NOXFaceLandmarksEngine {
  analyze(result) {
    if (!result?.detected || result.source !== "mediapipe-face-landmarker-478" ||
        !Array.isArray(result.landmarks) || result.landmarks.length < 468 ||
        !Number.isInteger(result.width) || !Number.isInteger(result.height) ||
        result.width <= 0 || result.height <= 0) {
      return { state: "unavailable", regions: {}, unavailable: REGION_KEYS.slice(), reason: "invalid-landmark-result" };
    }

    const regions = {};
    const unavailable = [];
    for (const key of REGION_KEYS) {
      const connections = result.connections?.[key];
      if (!Array.isArray(connections) || connections.length === 0) {
        unavailable.push(key);
        continue;
      }
      const edges = [];
      const indices = new Set();
      let valid = true;
      for (const edge of connections) {
        const start = Number(edge?.start);
        const end = Number(edge?.end);
        if (!Number.isInteger(start) || !Number.isInteger(end) ||
            start < 0 || end < 0 || start >= result.landmarks.length ||
            end >= result.landmarks.length || start === end) {
          valid = false;
          break;
        }
        indices.add(start);
        indices.add(end);
        edges.push([start, end]);
      }
      if (!valid || indices.size < 3) {
        unavailable.push(key);
        continue;
      }
      regions[key] = {
        points: [...indices].map(index => ({ index, ...result.landmarks[index] })),
        edges,
        source: "mediapipe-official-face-connections"
      };
    }

    return {
      state: Object.keys(regions).length ? (unavailable.length ? "partial" : "complete") : "unavailable",
      width: result.width,
      height: result.height,
      source: result.source,
      landmarkCount: result.landmarks.length,
      frameId: result.frameId,
      timestamp: result.timestamp,
      capturedAtMonotonicMs: result.capturedAtMonotonicMs,
      coordinateSpace: result.coordinateSpace,
      regions,
      unavailable
    };
  }
}
