import { describe, expect, it, jest } from '@jest/globals';

import { DuoCameraView } from '../DuoCameraView.ios';
import type { DuoCameraViewState } from '../types';

jest.mock('react', () => ({
  ...jest.requireActual<typeof import('react')>('react'),
  useCallback: (callback: unknown) => callback,
}));

jest.mock('../native/DuoCameraNativeComponent', () => 'NativeDuoCameraView');

function emit(payload: string) {
  const listener = jest.fn<(state: DuoCameraViewState) => void>();
  const view = DuoCameraView({
    location: 'inner',
    smartFraming: 'monitor',
    onStateChange: listener,
  });
  view.props.onStateChange({ nativeEvent: { payload } });
  return listener.mock.calls[0]?.[0];
}

describe('camera lifecycle state bridge', () => {
  it('preserves interruption metadata and the original system reason code', () => {
    const state = {
      running: false,
      status: 'interrupted',
      interrupted: true,
      interruptionReason: 'systemPressure',
      interruptionReasonCode: 5,
      error: null,
      errorDetails: null,
    };
    expect(emit(JSON.stringify(state))).toEqual(state);
  });

  it('preserves runtime error details without replacing the readable error', () => {
    const state = {
      status: 'error',
      running: false,
      error: 'Media services were reset',
      errorDetails: {
        code: 'mediaServicesReset',
        nativeDomain: 'AVFoundationErrorDomain',
        nativeCode: -11819,
        recoverable: true,
      },
    };
    expect(emit(JSON.stringify(state))).toEqual(state);
  });

  it('keeps a deterministic fallback for malformed native events', () => {
    expect(emit('not JSON')).toMatchObject({
      location: 'inner',
      supported: false,
      running: false,
      status: 'unsupported',
      interrupted: false,
      interruptionReason: null,
      interruptionReasonCode: null,
      error: null,
      errorDetails: null,
      smartFraming: { mode: 'monitor' },
    });
  });

  it('keeps older native payloads compatible with additive optional fields', () => {
    const oldState = { running: false, error: null };
    expect(emit(JSON.stringify(oldState))).toEqual(oldState);
  });
});
