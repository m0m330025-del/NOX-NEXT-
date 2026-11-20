/**
 * NOX Facial Mask Builder.
 *
 * Builds a geometry-only lip preview from MediaPipe's official lip boundary
 * graph and official face tessellation edges. It deliberately does not assign
 * a confidence score and is not accepted by the makeup compositor.
 */
const MAX_PIXELS = 1_048_576;
const MAX_MESH_EDGES = 20_000;
const MAX_VERTEX_DEGREE = 64;
const MAX_MESH_TRIANGLES = 50_000;

function validPoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.y > point.y) !== (b.y > point.y);
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function closedLoops(connections, landmarks) {
  if (!Array.isArray(connections) || connections.length < 6 || connections.length > 256) return [];
  const adjacency = new Map();
  for (const edge of connections) {
    const a = Number(edge?.start);
    const b = Number(edge?.end);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b ||
        a < 0 || b < 0 || a >= landmarks.length || b >= landmarks.length) return [];
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }
  if ([...adjacency.values()].some(neighbors => neighbors.size !== 2)) return [];
  const unseen = new Set(adjacency.keys());
  const loops = [];
  while (unseen.size) {
    const start = unseen.values().next().value;
    const loop = [];
    let previous = -1;
    let current = start;
    for (let guard = 0; guard <= adjacency.size; guard += 1) {
      if (!unseen.has(current) && current !== start) return [];
      unseen.delete(current);
      loop.push(landmarks[current]);
      const neighbors = [...adjacency.get(current)];
      const next = neighbors[0] === previous ? neighbors[1] : neighbors[0];
      previous = current;
      current = next;
      if (current === start) break;
      if (guard === adjacency.size) return [];
    }
    if (current !== start || loop.length < 3 || loop.some(point => !validPoint(point))) return [];
    loops.push(loop);
  }
  return loops;
}

function meshTriangles(edges, landmarkCount) {
  if (!Array.isArray(edges) || edges.length < 3 || edges.length > MAX_MESH_EDGES) return [];
  const adjacency = new Map();
  const normalized = new Set();
  for (const edge of edges) {
    const a = Number(edge?.start);
    const b = Number(edge?.end);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 ||
        a >= landmarkCount || b >= landmarkCount || a === b) return [];
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo + ":" + hi;
    if (normalized.has(key)) continue;
    normalized.add(key);
    if (!adjacency.has(lo)) adjacency.set(lo, new Set());
    if (!adjacency.has(hi)) adjacency.set(hi, new Set());
    adjacency.get(lo).add(hi);
    adjacency.get(hi).add(lo);
  }
  if ([...adjacency.values()].some(neighbors => neighbors.size > MAX_VERTEX_DEGREE)) return [];
  const triangles = [];
  for (const [a, neighbors] of adjacency) {
    const ordered = [...neighbors].filter(value => value > a).sort((x, y) => x - y);
    for (let i = 0; i < ordered.length; i += 1) {
      const b = ordered[i];
      for (let j = i + 1; j < ordered.length; j += 1) {
        const c = ordered[j];
        if (adjacency.get(b)?.has(c)) {
          triangles.push([a, b, c]);
          if (triangles.length > MAX_MESH_TRIANGLES) return [];
        }
      }
    }
  }
  return triangles;
}

function pointInTriangle(p, a, b, c) {
  const v0x = c.x - a.x;
  const v0y = c.y - a.y;
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = p.x - a.x;
  const v2y = p.y - a.y;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const denominator = dot00 * dot11 - dot01 * dot01;
  if (Math.abs(denominator) < 1e-12) return false;
  const u = (dot11 * dot02 - dot01 * dot12) / denominator;
  const v = (dot00 * dot12 - dot01 * dot02) / denominator;
  return u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7;
}

export class NOXFacialMaskBuilder {
  build(result, { width = result?.width, height = result?.height } = {}) {
    const unavailable = ["lips", "leftEyelid", "rightEyelid", "leftBrow", "rightBrow", "leftCheek", "rightCheek"];
    if (!result?.detected || result.source !== "mediapipe-face-landmarker-478" ||
        !Array.isArray(result.landmarks) || result.landmarks.length < 468 ||
        !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width * height > MAX_PIXELS) {
      return { state: "unavailable", masks: {}, unavailable, reason: "invalid-face-mesh-input" };
    }
    const landmarks = result.landmarks;
    if (landmarks.some(point => !validPoint(point))) {
      return { state: "unavailable", masks: {}, unavailable, reason: "invalid-face-landmark" };
    }
    const loops = closedLoops(result.connections?.lips, landmarks);
    const triangles = meshTriangles(result.connections?.tessellation, landmarks.length);
    if (loops.length !== 2 || triangles.length === 0) {
      return { state: "unavailable", masks: {}, unavailable, reason: "closed-lip-loops-or-tessellation-missing" };
    }
    const sortedLoops = loops.map(points => ({ points, area: Math.abs(polygonArea(points)) }))
      .sort((a, b) => b.area - a.area);
    if (!Number.isFinite(sortedLoops[0].area) || sortedLoops[0].area <= sortedLoops[1].area ||
        sortedLoops[1].area <= 0) {
      return { state: "unavailable", masks: {}, unavailable, reason: "ambiguous-lip-contours" };
    }
    const outer = sortedLoops[0].points;
    const inner = sortedLoops[1].points;
    const candidates = triangles.map(indices => indices.map(index => landmarks[index]))
      .filter(([a, b, c]) => {
        const center = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
        return pointInPolygon(center, outer) && !pointInPolygon(center, inner);
      });
    if (!candidates.length) {
      return { state: "unavailable", masks: {}, unavailable, reason: "no-mesh-triangles-in-lip-annulus" };
    }
    const mask = new Float32Array(width * height);
    const xs = outer.map(point => point.x);
    const ys = outer.map(point => point.y);
    const minX = Math.max(0, Math.floor(Math.min(...xs) * width));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...xs) * width));
    const minY = Math.max(0, Math.floor(Math.min(...ys) * height));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...ys) * height));
    let pixelCount = 0;
    // Rasterize only within each candidate triangle's bounding box. The previous
    // whole-contour scan tested every pixel against every candidate triangle,
    // which could become prohibitively expensive on dense face tessellations.
    for (const [a, b, c] of candidates) {
      const triMinX = Math.max(minX, Math.floor(Math.min(a.x, b.x, c.x) * width));
      const triMaxX = Math.min(maxX, Math.ceil(Math.max(a.x, b.x, c.x) * width));
      const triMinY = Math.max(minY, Math.floor(Math.min(a.y, b.y, c.y) * height));
      const triMaxY = Math.min(maxY, Math.ceil(Math.max(a.y, b.y, c.y) * height));
      for (let y = triMinY; y <= triMaxY; y += 1) {
        for (let x = triMinX; x <= triMaxX; x += 1) {
          const index = y * width + x;
          if (mask[index] !== 0) continue;
          const point = { x: (x + 0.5) / width, y: (y + 0.5) / height };
          if (!pointInPolygon(point, outer) || pointInPolygon(point, inner)) continue;
          if (!pointInTriangle(point, a, b, c)) continue;
          mask[index] = 1;
          pixelCount += 1;
        }
      }
    }
    if (pixelCount < 1) {
      return { state: "unavailable", masks: {}, unavailable, reason: "empty-lip-raster" };
    }
    return {
      state: "partial",
      width,
      height,
      masks: {
        lips: {
          width, height, data: mask, pixelCount,
          source: "mediapipe-official-lip-loops-plus-face-tessellation",
          confidence: null,
          usage: "geometry-preview-only; not trusted by makeup compositor"
        }
      },
      unavailable: unavailable.filter(region => region !== "lips"),
      reason: "only-closed-lip-annulus-is-geometrically-derived"
    };
  }
}
