/**
 * NOX Sparse Optical Flow Engine.
 * Bounded block-matching flow for small grayscale camera samples.
 * Confidence is a local match-uniqueness heuristic, not calibrated probability.
 */
function isBytePlane(value, length) {
  return (value instanceof Uint8Array || value instanceof Uint8ClampedArray) &&
    value.length === length;
}

export class NOXSparseOpticalFlowEngine {
  constructor({ maxDimension = 128, minConfidence = 0.06 } = {}) {
    this.maxDimension = Math.max(16, Math.floor(maxDimension));
    this.minConfidence = Math.max(0, Math.min(1, Number(minConfidence)));
    this.lastResult = null;
  }

  process(current, previous, width, height, { cellStep = 8, patchRadius = 1, searchRadius = 3 } = {}) {
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || width > this.maxDimension || height > this.maxDimension ||
        !isBytePlane(current, width * height) || !isBytePlane(previous, width * height)) {
      throw new TypeError("invalid-optical-flow-frame");
    }
    const step = Math.max(1, Math.min(32, Math.floor(cellStep)));
    const patch = Math.max(1, Math.min(3, Math.floor(patchRadius)));
    const search = Math.max(1, Math.min(6, Math.floor(searchRadius)));
    const vectors = [];
    let confidenceTotal = 0;
    const border = search + patch;

    if (width <= border * 2 || height <= border * 2) {
      const empty = { vectors, confidence: 0, sampleCount: 0, width, height };
      this.lastResult = empty;
      return empty;
    }

    for (let cy = border; cy < height - border; cy += step) {
      for (let cx = border; cx < width - border; cx += step) {
        let bestSad = Infinity;
        let secondSad = Infinity;
        let bestDx = 0;
        let bestDy = 0;
        for (let dy = -search; dy <= search; dy += 1) {
          for (let dx = -search; dx <= search; dx += 1) {
            let sad = 0;
            for (let py = -patch; py <= patch; py += 1) {
              for (let px = -patch; px <= patch; px += 1) {
                const index = (cy + py) * width + cx + px;
                const previousIndex = (cy + dy + py) * width + cx + dx + px;
                sad += Math.abs(current[index] - previous[previousIndex]);
              }
            }
            if (sad < bestSad) {
              secondSad = bestSad;
              bestSad = sad;
              bestDx = dx;
              bestDy = dy;
            } else if (sad < secondSad) {
              secondSad = sad;
            }
          }
        }
        const uniqueness = secondSad === Infinity ? 0 :
          Math.max(0, Math.min(1, (secondSad - bestSad) / (secondSad + 1)));
        const texture = Math.min(1, secondSad / 90);
        const confidence = uniqueness * texture;
        if (confidence > this.minConfidence) {
          vectors.push({
            x: cx / width,
            y: cy / height,
            dx: -bestDx / width,
            dy: -bestDy / height,
            confidence
          });
          confidenceTotal += confidence;
        }
      }
    }

    const result = {
      vectors,
      confidence: vectors.length ? confidenceTotal / vectors.length : 0,
      sampleCount: vectors.length,
      width,
      height
    };
    this.lastResult = result;
    return result;
  }

  reset() {
    this.lastResult = null;
  }
}
