/**
 * Resize a canvas backing store only when its dimensions actually change.
 * Canvas dimension assignment clears the drawing buffer, so redundant writes
 * can erase a frame and trigger avoidable GPU/CPU allocations.
 */
export function ensureNOXCanvasSize(canvas, width, height) {
  if (!canvas || !Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1) {
    return false;
  }

  if (canvas.width === width && canvas.height === height) return false;

  canvas.width = width;
  canvas.height = height;
  return true;
}
