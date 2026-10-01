import type { DuoInsets, DuoRect, DuoToolbarContentLayout } from '../types';

const edgeToEdgeInsets: DuoInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Keep native unobscured insets available even when children opt out of them. */
export function resolveToolbarLayoutInsets(
  contentInsets: DuoInsets,
  contentLayout: DuoToolbarContentLayout = 'safeArea'
): DuoInsets {
  return contentLayout === 'edgeToEdge' ? edgeToEdgeInsets : contentInsets;
}

/** Resolve the native viewport in host points, independent of stale Yoga bounds. */
export function resolveToolbarContentFrame(
  contentSize: Pick<DuoRect, 'width' | 'height'> | undefined,
  contentInsets: DuoInsets,
  contentLayout: DuoToolbarContentLayout = 'safeArea'
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
  const layoutInsets = resolveToolbarLayoutInsets(contentInsets, contentLayout);
  const clampInset = (value: number, extent: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(value, extent)) : 0;
  let left = clampInset(layoutInsets.left, width);
  let right = clampInset(layoutInsets.right, width);
  let top = clampInset(layoutInsets.top, height);
  let bottom = clampInset(layoutInsets.bottom, height);

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
