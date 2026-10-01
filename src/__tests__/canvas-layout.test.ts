import { describe, expect, it } from '@jest/globals';

import { resolveCanvasControlInsets } from '../../example/src/components/labs/canvas-layout';
import type {
  DuoGeometryState,
  DuoInsets,
  DuoReservedRegion,
  DuoToolbarState,
} from '../types';

const zero: DuoInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const size = { width: 654, height: 688 };
const hardware: DuoInsets = { top: 0, right: 84, bottom: 12, left: 0 };
const toolbar: DuoToolbarState = {
  native: true,
  isVertical: true,
  verticalBarEdge: 'trailing',
  contentInsets: { top: 80, right: 84, bottom: 12, left: 0 },
  contentSize: size,
};

function region(
  frame: DuoReservedRegion['frame'],
  extra: Partial<DuoReservedRegion> = {}
): DuoReservedRegion {
  return {
    id: 'region',
    kind: 'occlusion',
    frame,
    margins: { top: 8, right: 8, bottom: 8, left: 8 },
    isActive: true,
    ...extra,
  };
}

function geometry(
  reservedRegions: DuoReservedRegion[] = [],
  extra: Partial<DuoGeometryState> = {}
): DuoGeometryState {
  return {
    native: true,
    ...size,
    safeAreaInsets: hardware,
    reservedRegions,
    ...extra,
  };
}

const input = {
  size,
  toolbarState: toolbar,
  contentLayout: 'edgeToEdge' as const,
  barsHidden: true,
  hardwareInsets: hardware,
};

describe('immersive canvas control placement', () => {
  it('handles a leading-edge camera without keeping a full left strip', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        hardwareInsets: { ...zero, left: 84, bottom: 12 },
        geometry: geometry([region({ x: 0, y: 0, width: 56, height: 72 })], {
          safeAreaInsets: { ...zero, left: 84, bottom: 12 },
        }),
      })
    ).toEqual({ top: 72, right: 0, bottom: 12, left: 0 });
  });

  it('avoids a small top-right camera vertically, not with a whole side rail', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        geometry: geometry([region({ x: 598, y: 0, width: 56, height: 72 })]),
      })
    ).toEqual({ top: 72, right: 0, bottom: 12, left: 0 });
  });

  it('uses margin-inclusive native frames without expanding their margins twice', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        geometry: geometry([region({ x: 600, y: -8, width: 62, height: 80 })]),
      })
    ).toEqual({ top: 72, right: 0, bottom: 12, left: 0 });
  });

  it('retains the full app-bar footprint while visible bars overlay the canvas', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        barsHidden: false,
        geometry: geometry([region({ x: 598, y: 0, width: 56, height: 72 })]),
      })
    ).toEqual(toolbar.contentInsets);
  });

  it('does not count host insets twice in safe-area content mode', () => {
    const childSize = { width: 570, height: 596 };
    expect(
      resolveCanvasControlInsets({
        ...input,
        size: childSize,
        contentLayout: 'safeArea',
        barsHidden: false,
        geometry: geometry(
          [region({ x: 598, y: -80, width: 56, height: 72 })],
          { ...childSize, safeAreaInsets: zero }
        ),
      })
    ).toEqual(zero);
  });

  it('preserves any local hardware inset still remaining inside a safe-area child', () => {
    const childSize = { width: 570, height: 608 };
    expect(
      resolveCanvasControlInsets({
        ...input,
        size: childSize,
        toolbarState: {
          ...toolbar,
          contentInsets: { ...toolbar.contentInsets, bottom: 0 },
        },
        contentLayout: 'safeArea',
        geometry: geometry([], {
          ...childSize,
          safeAreaInsets: { ...zero, bottom: 12 },
        }),
      })
    ).toEqual({ ...zero, bottom: 12 });
  });

  it('ignores inactive, out-of-bounds, zero-sized, and malformed regions', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        geometry: geometry([
          region({ x: 598, y: 0, width: 56, height: 72 }, { isActive: false }),
          region({ x: 700, y: 0, width: 56, height: 72 }),
          region({ x: 600, y: 0, width: 0, height: 72 }),
          region({ x: Number.NaN, y: 0, width: 56, height: 72 }),
        ]),
      })
    ).toEqual(hardware);
  });

  it.each([
    undefined,
    geometry([], { native: false }),
    geometry([], { width: 450 }),
    geometry([], { height: Number.NaN }),
  ])(
    'falls back conservatively when local native geometry is unavailable: %p',
    (local) => {
      expect(resolveCanvasControlInsets({ ...input, geometry: local })).toEqual(
        toolbar.contentInsets
      );
      expect(
        resolveCanvasControlInsets({
          ...input,
          contentLayout: 'safeArea',
          geometry: local,
        })
      ).toEqual(zero);
    }
  );

  it('chooses the wider physical lane around a full-height vertical fold', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        hardwareInsets: { ...zero, bottom: 12 },
        geometry: geometry(
          [
            region(
              { x: 290, y: -20, width: 12, height: 728 },
              { kind: 'division' }
            ),
          ],
          { safeAreaInsets: { ...zero, bottom: 12 } }
        ),
      })
    ).toEqual({ top: 0, right: 0, bottom: 12, left: 302 });
  });

  it('chooses one vertical lane around a full-width horizontal fold', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        hardwareInsets: { ...zero, bottom: 12 },
        geometry: geometry(
          [
            region(
              { x: -10, y: 320, width: 674, height: 12 },
              { kind: 'division' }
            ),
          ],
          { safeAreaInsets: { ...zero, bottom: 12 } }
        ),
      })
    ).toEqual({ top: 332, right: 0, bottom: 12, left: 0 });
  });

  it('ignores camera shapes outside the control lane selected by a fold', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        hardwareInsets: { ...zero, bottom: 12 },
        geometry: geometry(
          [
            region({ x: 598, y: 0, width: 56, height: 72 }),
            region(
              { x: 350, y: 0, width: 12, height: size.height },
              { kind: 'division' }
            ),
          ],
          { safeAreaInsets: { ...zero, bottom: 12 } }
        ),
      })
    ).toEqual({ top: 0, right: 304, bottom: 12, left: 0 });
  });

  it('moves bottom controls above a lower-edge occlusion and home gesture area', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        geometry: geometry(
          [region({ x: 250, y: 630, width: 100, height: 58 })],
          { safeAreaInsets: { ...zero, bottom: 12 } }
        ),
      })
    ).toEqual({ top: 0, right: 0, bottom: 58, left: 0 });
  });

  it('keeps a safe-area fallback if a region leaves no usable control lane', () => {
    expect(
      resolveCanvasControlInsets({
        ...input,
        geometry: geometry([region({ x: 0, y: 0, width: 654, height: 688 })]),
      })
    ).toEqual(toolbar.contentInsets);
  });

  it('sanitizes invalid fallback insets and does not mutate native diagnostics', () => {
    const state = {
      ...toolbar,
      contentInsets: { top: -1, right: Number.NaN, bottom: 12, left: 0 },
    };
    expect(
      resolveCanvasControlInsets({
        ...input,
        toolbarState: state,
        hardwareInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      })
    ).toEqual({ ...zero, bottom: 12 });
    expect(state.contentInsets.top).toBe(-1);
    expect(state.contentInsets.right).toBeNaN();
  });
});
