import type { DuoInsets, DuoRect } from '../types';

/** Resolve the native viewport in host points, independent of stale Yoga bounds. */
export function resolveToolbarContentFrame(
  contentSize: Pick<DuoRect, 'width' | 'height'> | undefined,
  contentInsets: DuoInsets
): DuoRect | null {
  if (
    !contentSize ||
    !Number.isFinite(contentSize.width) ||
    !Number.isFinite(contentSize.height) ||
    contentSize.width <= 0 ||
    contentSize.height <= 0
  ) {
    return null;
  }

  const { width, height } = contentSize;
  const clampInset = (value: number, extent: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(value, extent)) : 0;
  let left = clampInset(contentInsets.left, width);
  let right = clampInset(contentInsets.right, width);
  let top = clampInset(contentInsets.top, height);
  let bottom = clampInset(contentInsets.bottom, height);

  // Reject transition guides that would erase an entire content axis.
  if (left + right >= width) left = right = 0;
  if (top + bottom >= height) top = bottom = 0;

  return {
    x: left,
    y: top,
    width: width - left - right,
    height: height - top - bottom,
  };
}
