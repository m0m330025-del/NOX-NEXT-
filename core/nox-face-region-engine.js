/**
 * NOX Face Region Engine v1
 *
 * Converts only landmarks explicitly supplied by the platform detector into
 * named geometric regions. It never estimates missing eyes, brows, cheeks,
 * lips, or facial contours.
 */

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const REGION_TYPES = new Map([
  ["eye", "eyes"],
  ["eyes", "eyes"],
  ["mouth", "mouth"],
  ["nose", "nose"]
]);

function boundsFor(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  if (right - left <= 0 || bottom - top <= 0) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export class NOXFaceRegionEngine {
  constructor({ minPoints = 2 } = {}) {
    this.minPoints = Math.max(2, Math.floor(Number(minPoints) || 2));
  }

  analyze(face) {
    const source = Array.isArray(face?.landmarks) ? face.landmarks : [];
    const buckets = new Map();

    for (const item of source) {
      const key = typeof item?.type === "string"
        ? REGION_TYPES.get(item.type.trim().toLowerCase())
        : null;
      if (!key || !Array.isArray(item.points)) continue;
      const points = item.points
        .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
        .filter((point) =>
          Number.isFinite(point.x) && Number.isFinite(point.y) &&
          point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
        );
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(...points);
    }

    const regions = {};
    for (const [name, points] of buckets) {
      if (points.length < this.minPoints) continue;
      const bounds = boundsFor(points);
      if (!bounds) continue;
      regions[name] = {
        bounds,
        points,
        source: "platform-landmarks",
        pointCount: points.length
      };
    }

    return {
      state: Object.keys(regions).length ? "partial" : "unavailable",
      regions,
      unavailable: ["eyes", "nose", "mouth", "brows", "cheeks", "jawline"]
        .filter((name) => !regions[name]),
      source: "platform-landmarks-only"
    };
  }

  reset() {
    // Stateless by design; provided for a consistent camera-engine lifecycle.
  }
}
