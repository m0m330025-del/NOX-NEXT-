/**
 * Compute the centered source rectangle used by CSS object-fit: cover.
 * Coordinates are in source pixels; output dimensions preserve the crop aspect.
 */
export function getNOXCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const values = [sourceWidth, sourceHeight, targetWidth, targetHeight].map(Number);
  if (!values.every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError("invalid-camera-cover-dimensions");
  }
  const [width, height, targetW, targetH] = values;
  const sourceAspect = width / height;
  const targetAspect = targetW / targetH;
  if (sourceAspect > targetAspect) {
    const cropWidth = height * targetAspect;
    const sx = (width - cropWidth) / 2;
    return {
      sx, sy: 0, sw: cropWidth, sh: height,
      outputWidth: Math.max(1, Math.round(cropWidth)),
      outputHeight: Math.max(1, Math.round(height))
    };
  }
  const cropHeight = width / targetAspect;
  const sy = (height - cropHeight) / 2;
  return {
    sx: 0, sy, sw: width, sh: cropHeight,
    outputWidth: Math.max(1, Math.round(width)),
    outputHeight: Math.max(1, Math.round(cropHeight))
  };
}
