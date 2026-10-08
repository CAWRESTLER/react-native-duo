import type { DuoArrangementAxes, DuoReservedRegion } from '../types';

export interface DuoFoldSplit {
  /** `row` places panes side by side around a vertical fold; `column` stacks them around a horizontal fold. */
  direction: 'row' | 'column';
  /** Primary pane length up to the fold, in container points. */
  primaryLength: number;
  /** Fold thickness to leave empty between the panes (0 for a non-occluding fold). */
  gap: number;
}

interface ContainerFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Finds an active fold crossing the container and returns where to split the
 * panes. `container` is the arrangement's frame in the provider's coordinate
 * space, the same space as the region frames.
 */
export function resolveFoldSplit(
  regions: DuoReservedRegion[],
  container: ContainerFrame | null,
  axes: DuoArrangementAxes = 'automatic'
): DuoFoldSplit | null {
  if (!container || container.width <= 0 || container.height <= 0) {
    return null;
  }
  for (const region of regions) {
    if (!region.isActive) continue;
    const { frame } = region;
    const verticalFold = frame.height >= frame.width;
    const direction = verticalFold ? 'row' : 'column';
    if (axes === 'vertical' && direction === 'row') continue;
    if (axes === 'horizontal' && direction === 'column') continue;

    const start = verticalFold ? frame.x - container.x : frame.y - container.y;
    const thickness = verticalFold ? frame.width : frame.height;
    const length = verticalFold ? container.width : container.height;
    const crossStart = verticalFold
      ? frame.y - container.y
      : frame.x - container.x;
    const crossLength = verticalFold ? frame.height : frame.width;
    const crossSize = verticalFold ? container.height : container.width;
    // The fold must cut through the container, not just touch an edge.
    if (start <= 0 || start + thickness >= length) continue;
    if (crossStart >= crossSize || crossStart + crossLength <= 0) continue;

    return { direction, primaryLength: start, gap: Math.max(0, thickness) };
  }
  return null;
}
