import { describe, expect, it } from '@jest/globals';

import { defaultDuoEnvironment } from '../context';
import { parseNativePayload } from '../native/events';

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
    });
  });
});
