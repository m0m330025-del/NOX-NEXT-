/**
 * NOX Smart Motion Separation Engine.
 * Separates a dominant, spatially distributed global-motion consensus from
 * non-global sparse-flow outliers. It does not identify people or object classes.
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function motionCenter(vectors) {
  return {
    dx: median(vectors.map(vector => vector.dx)),
    dy: median(vectors.map(vector => vector.dy))
  };
}

function spatialClusters(vectors, maxDistance) {
  const visited = new Set();
  const clusters = [];
  for (let start = 0; start < vectors.length; start += 1) {
    if (visited.has(start)) continue;
    const queue = [start];
    const cluster = [];
    visited.add(start);
    while (queue.length) {
      const index = queue.pop();
      const vector = vectors[index];
      cluster.push(vector);
      for (let candidate = 0; candidate < vectors.length; candidate += 1) {
        if (visited.has(candidate)) continue;
        const other = vectors[candidate];
        if (Math.hypot(vector.x - other.x, vector.y - other.y) <= maxDistance) {
          visited.add(candidate);
          queue.push(candidate);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export class NOXSmartMotionSeparationEngine {
  constructor({
    minConfidence = 0.12,
    minVectorCount = 4,
    minBackgroundRatio = 0.55,
    maxMotionResidual = 0.028,
    minSpatialSpan = 0.25,
    maxVectors = 128
  } = {}) {
    this.options = {
      minConfidence, minVectorCount, minBackgroundRatio,
      maxMotionResidual, minSpatialSpan, maxVectors
    };
    this.reset();
  }

  process(vectors) {
    if (!Array.isArray(vectors) || vectors.length > this.options.maxVectors) {
      return this.reject("invalid-motion-vector-set");
    }
    const usable = vectors.filter(vector =>
      vector && Number.isFinite(vector.x) && Number.isFinite(vector.y) &&
      vector.x >= 0 && vector.x <= 1 && vector.y >= 0 && vector.y <= 1 &&
      Number.isFinite(vector.dx) && Number.isFinite(vector.dy) &&
      Number.isFinite(vector.confidence) && vector.confidence >= this.options.minConfidence
    );
    if (usable.length < this.options.minVectorCount) {
      return this.reject("insufficient-motion-vectors", usable.length);
    }

    let best = [];
    let bestScore = -Infinity;
    for (const candidate of usable) {
      const consensus = usable.filter(vector =>
        Math.hypot(vector.dx - candidate.dx, vector.dy - candidate.dy) <= this.options.maxMotionResidual
      );
      const confidence = consensus.reduce((sum, vector) => sum + vector.confidence, 0);
      const score = consensus.length + confidence * 0.01;
      if (score > bestScore) {
        best = consensus;
        bestScore = score;
      }
    }

    let center = motionCenter(best);
    let globalVectors = usable.filter(vector =>
      Math.hypot(vector.dx - center.dx, vector.dy - center.dy) <= this.options.maxMotionResidual
    );
    center = motionCenter(globalVectors);
    globalVectors = usable.filter(vector =>
      Math.hypot(vector.dx - center.dx, vector.dy - center.dy) <= this.options.maxMotionResidual
    );
    const backgroundRatio = globalVectors.length / usable.length;
    if (globalVectors.length < this.options.minVectorCount ||
        backgroundRatio < this.options.minBackgroundRatio) {
      return this.reject("no-dominant-global-motion", usable.length, {
        backgroundCount: globalVectors.length, backgroundRatio
      });
    }

    const spanX = Math.max(...globalVectors.map(vector => vector.x)) -
      Math.min(...globalVectors.map(vector => vector.x));
    const spanY = Math.max(...globalVectors.map(vector => vector.y)) -
      Math.min(...globalVectors.map(vector => vector.y));
    if (spanX < this.options.minSpatialSpan || spanY < this.options.minSpatialSpan) {
      return this.reject("global-motion-lacks-spatial-coverage", usable.length, {
        backgroundCount: globalVectors.length, backgroundRatio, spanX, spanY
      });
    }

    const outlierVectors = usable.filter(vector => !globalVectors.includes(vector));
    const localizedMotionCandidates = spatialClusters(outlierVectors, 0.19)
      .filter(cluster => {
        if (cluster.length < 3) return false;
        const localCenter = motionCenter(cluster);
        const residual = median(cluster.map(vector =>
          Math.hypot(vector.dx - localCenter.dx, vector.dy - localCenter.dy)
        ));
        return residual <= this.options.maxMotionResidual;
      });

    const confidence = globalVectors.reduce((sum, vector) => sum + vector.confidence, 0) /
      globalVectors.length * backgroundRatio;
    this.lastResult = {
      accepted: true,
      reason: "dominant-global-motion-found",
      dx: center.dx,
      dy: center.dy,
      confidence,
      vectorCount: usable.length,
      backgroundCount: globalVectors.length,
      backgroundRatio,
      outlierCount: outlierVectors.length,
      localizedMotionCount: localizedMotionCandidates.reduce((sum, cluster) => sum + cluster.length, 0),
      globalVectors,
      outlierVectors,
      localizedMotionCandidates
    };
    return this.lastResult;
  }

  reject(reason, vectorCount = 0, details = {}) {
    this.lastResult = {
      accepted: false, reason, vectorCount,
      backgroundCount: 0, backgroundRatio: 0,
      globalVectors: [], outlierVectors: [], localizedMotionCandidates: [],
      ...details
    };
    return this.lastResult;
  }

  getStatus() {
    return this.lastResult ? { ...this.lastResult } : {
      accepted: false, reason: "no-motion-sample",
      backgroundCount: 0, outlierCount: 0, localizedMotionCount: 0
    };
  }

  reset() {
    this.lastResult = null;
  }
}
