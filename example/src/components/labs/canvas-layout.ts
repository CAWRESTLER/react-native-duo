import type {
  DuoGeometryState,
  DuoInsets,
  DuoRect,
  DuoReservedRegion,
  DuoToolbarContentLayout,
  DuoToolbarState,
} from '@cawrestler/react-native-duo';

interface CanvasControlLayoutInput {
  size: Pick<DuoRect, 'width' | 'height'>;
  toolbarState: DuoToolbarState;
  contentLayout: DuoToolbarContentLayout;
  barsHidden: boolean;
  geometry?: DuoGeometryState;
  hardwareInsets: DuoInsets;
}

const edges = ['top', 'right', 'bottom', 'left'] as const;

function positive(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function sanitizedInsets(insets: DuoInsets | undefined): DuoInsets {
  return {
    top: positive(insets?.top),
    right: positive(insets?.right),
    bottom: positive(insets?.bottom),
    left: positive(insets?.left),
  };
}

function validSize(size: Pick<DuoRect, 'width' | 'height'> | undefined) {
  return Boolean(
    size &&
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

function activeLocalRegions(
  regions: readonly DuoReservedRegion[],
  size: Pick<DuoRect, 'width' | 'height'>
) {
  return regions.flatMap((region) => {
    const { frame } = region;
    if (
      !region.isActive ||
      (region.kind !== 'division' && region.kind !== 'occlusion') ||
      !frame ||
      ![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) ||
      frame.width <= 0 ||
      frame.height <= 0
    ) {
      return [];
    }
    // UIKit's reserved-region frame ALREADY includes its interaction margins.
    // The package preserves that frame: expanding margins again double-counts.
    const x = Math.max(0, frame.x);
    const y = Math.max(0, frame.y);
    const right = Math.min(size.width, frame.x + frame.width);
    const bottom = Math.min(size.height, frame.y + frame.height);
    if (right <= x || bottom <= y) return [];
    return [{ kind: region.kind, x, y, right, bottom }];
  });
}

/**
 * Protect the canvas's top/bottom control bands, not its decorative drawing.
 * This example chooses one rectangular control lane; it is not a general
 * collision solver or a promise that arbitrarily large controls will fit.
 */
export function resolveCanvasControlInsets({
  size,
  toolbarState,
  contentLayout,
  barsHidden,
  geometry,
  hardwareInsets,
}: CanvasControlLayoutInput): DuoInsets {
  const reported = sanitizedInsets(toolbarState.contentInsets);
  const hardware = sanitizedInsets(hardwareInsets);
  const alreadyApplied = sanitizedInsets(
    contentLayout === 'safeArea' ? reported : undefined
  );
  const fallback = sanitizedInsets(undefined);
  for (const edge of edges) {
    fallback[edge] = Math.max(
      0,
      Math.max(reported[edge], hardware[edge]) - alreadyApplied[edge]
    );
  }

  // Geometry is expressed in the actual CHILD canvas's coordinates. Never
  // apply a stale full-host/previous-pose snapshot to a differently sized child.
  if (
    !validSize(size) ||
    !geometry?.native ||
    !validSize(geometry) ||
    Math.abs(geometry.width - size.width) > 1 ||
    Math.abs(geometry.height - size.height) > 1
  ) {
    return fallback;
  }

  const localSafe = sanitizedInsets(geometry.safeAreaInsets);
  const regions = activeLocalRegions(geometry.reservedRegions, size);
  const occlusions = regions.filter((region) => region.kind === 'occlusion');
  const insets = { ...localSafe };
  if (contentLayout === 'edgeToEdge' && !barsHidden) {
    // App bars still occupy their complete native footprint even if a camera
    // occlusion is small. Immersive rendering does not make app chrome vanish.
    for (const edge of edges) {
      insets[edge] = Math.max(insets[edge], reported[edge], hardware[edge]);
    }
  } else if (barsHidden && occlusions.length > 0) {
    // Replace a broad system side safe area only where active local occlusions
    // account for that side. A top-right camera is avoided vertically below;
    // it does not shrink every control to the left of a whole right-hand rail.
    if (occlusions.some((region) => region.x < localSafe.left)) {
      insets.left = 0;
    }
    if (
      occlusions.some((region) => region.right > size.width - localSafe.right)
    ) {
      insets.right = 0;
    }
  }
  // Preserve the physical bottom/home gesture area even when all app bars are
  // hidden. In safeArea mode the host's applied bottom is already consumed.
  insets.bottom = Math.max(
    insets.bottom,
    hardware.bottom - alreadyApplied.bottom,
    0
  );

  // Resolve divisions before occlusions so a fold selects one physical lane,
  // then ignore camera/status regions that lie entirely in the other lane.
  const orderedRegions = [
    ...regions.filter((region) => region.kind === 'division'),
    ...occlusions,
  ];
  for (const region of orderedRegions) {
    const left = insets.left;
    const right = size.width - insets.right;
    const top = insets.top;
    const bottom = size.height - insets.bottom;
    if (
      region.right <= left ||
      region.x >= right ||
      region.bottom <= top ||
      region.y >= bottom
    ) {
      continue;
    }
    const leftLane = Math.max(0, region.x - left);
    const rightLane = Math.max(0, right - region.right);
    const topLane = Math.max(0, region.y - top);
    const bottomLane = Math.max(0, bottom - region.bottom);
    const verticalDivision =
      region.kind === 'division' &&
      region.bottom - region.y >= region.right - region.x;
    const coversControlHeight = region.y <= top && region.bottom >= bottom;
    if (verticalDivision || coversControlHeight) {
      if (Math.max(leftLane, rightLane) <= 0) return fallback;
      if (leftLane >= rightLane) {
        insets.right = size.width - region.x;
      } else {
        insets.left = region.right;
      }
    } else {
      // Localized occlusions choose the larger above/below lane. Thus a small
      // upper-edge camera increases TOP, while a lower-edge shape adds BOTTOM.
      if (Math.max(topLane, bottomLane) <= 0) return fallback;
      if (topLane >= bottomLane) {
        insets.bottom = size.height - region.y;
      } else {
        insets.top = region.bottom;
      }
    }
  }
  return insets;
}
