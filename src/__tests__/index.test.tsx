import { describe, expect, it } from '@jest/globals';

import { defaultDuoEnvironment } from '../context';
import { parseNativePayload } from '../native/events';
import {
  resolveToolbarContentFrame,
  resolveToolbarLayoutInsets,
} from '../native/layout';

describe('resolveToolbarContentFrame', () => {
  const railInsets = { top: 82, right: 84, bottom: 0, left: 0 };

  it('sizes content from the native viewport after an open-to-compact transition', () => {
    expect(
      resolveToolbarContentFrame({ width: 654, height: 688 }, railInsets)
    ).toEqual({
      x: 0,
      y: 82,
      width: 570,
      height: 606,
    });
    expect(
      resolveToolbarContentFrame({ width: 450, height: 688 }, railInsets)
    ).toEqual({
      x: 0,
      y: 82,
      width: 366,
      height: 606,
    });
  });

  it('reserves horizontal navigation, toolbar, and tab boundaries', () => {
    expect(
      resolveToolbarContentFrame(
        { width: 450, height: 688 },
        { top: 44, right: 0, bottom: 100, left: 0 }
      )
    ).toEqual({ x: 0, y: 44, width: 450, height: 544 });
  });

  it('preserves the safe layout as the default and fills the host only when opted in', () => {
    const size = { width: 450, height: 688 };
    expect(resolveToolbarContentFrame(size, railInsets, 'safeArea')).toEqual(
      resolveToolbarContentFrame(size, railInsets)
    );
    expect(resolveToolbarContentFrame(size, railInsets, 'edgeToEdge')).toEqual({
      x: 0,
      y: 0,
      width: 450,
      height: 688,
    });
    // Native diagnostics remain intact for positioning foreground controls.
    expect(railInsets).toEqual({ top: 82, right: 84, bottom: 0, left: 0 });
  });

  it.each([
    { top: 82, right: 84, bottom: 0, left: 0 },
    { top: 82, right: 0, bottom: 0, left: 84 },
    { top: 44, right: 0, bottom: 100, left: 0 },
  ])(
    'does not reserve either bar axis in an edge-to-edge canvas: %p',
    (insets) => {
      expect(
        resolveToolbarContentFrame(
          { width: 654, height: 688 },
          insets,
          'edgeToEdge'
        )
      ).toEqual({ x: 0, y: 0, width: 654, height: 688 });
    }
  );

  it('applies the selected inset policy before native viewport measurements arrive', () => {
    expect(resolveToolbarLayoutInsets(railInsets)).toBe(railInsets);
    expect(resolveToolbarLayoutInsets(railInsets, 'edgeToEdge')).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('recalculates the full-width canvas across folding and restoring the safe mode', () => {
    for (const width of [654, 450, 654]) {
      expect(
        resolveToolbarContentFrame(
          { width, height: 688 },
          railInsets,
          'edgeToEdge'
        )
      ).toEqual({ x: 0, y: 0, width, height: 688 });
      expect(
        resolveToolbarContentFrame(
          { width, height: 688 },
          railInsets,
          'safeArea'
        )
      ).toEqual({ x: 0, y: 82, width: width - 84, height: 606 });
    }
  });

  it.each([
    undefined,
    { width: 0, height: 688 },
    { width: 450, height: 0 },
    { width: Number.NaN, height: 688 },
    { width: 450, height: Number.POSITIVE_INFINITY },
  ])('waits for valid native bounds in both modes: %p', (size) => {
    expect(resolveToolbarContentFrame(size, railInsets)).toBeNull();
    expect(
      resolveToolbarContentFrame(size, railInsets, 'edgeToEdge')
    ).toBeNull();
  });

  it('sanitizes invalid insets and avoids an empty content rectangle', () => {
    expect(
      resolveToolbarContentFrame(
        { width: 450, height: 688 },
        {
          top: -20,
          right: Number.NaN,
          bottom: Number.POSITIVE_INFINITY,
          left: 10,
        }
      )
    ).toEqual({ x: 10, y: 0, width: 440, height: 688 });
    expect(
      resolveToolbarContentFrame(
        { width: 450, height: 688 },
        { top: 400, right: 300, bottom: 400, left: 300 }
      )
    ).toEqual({ x: 0, y: 0, width: 450, height: 688 });
  });
});

describe('parseNativePayload', () => {
  it('parses a valid native JSON event', () => {
    expect(parseNativePayload('{"isDuo":true}', { isDuo: false })).toEqual({
      isDuo: true,
    });
  });

  it('returns the exact fallback for malformed native data', () => {
    const fallback = { supported: false };

    expect(parseNativePayload('not JSON', fallback)).toBe(fallback);
  });

  it.each(['null', 'true', '42', '"unsupported"', '[]'])(
    'rejects a non-object native payload: %s',
    (payload) => {
      const fallback = { native: false };
      expect(parseNativePayload(payload, fallback)).toBe(fallback);
    }
  );
});

describe('defaultDuoEnvironment', () => {
  it('is a complete and safe unsupported state', () => {
    expect(defaultDuoEnvironment).toMatchObject({
      supportsDuoApis: false,
      isDuo: false,
      platform: 'unknown',
      hinge: {
        available: false,
        status: 'unavailable',
        angleRadians: null,
        angleDegrees: null,
      },
      reservedRegions: [],
      verticalBarEdge: 'unavailable',
      cameras: [],
      horizontalSizeClass: 'unspecified',
      verticalSizeClass: 'unspecified',
      supportsMultipleWindows: false,
      geometry: {
        native: false,
        width: 0,
        height: 0,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        reservedRegions: [],
      },
    });
  });
});
