import { useEffect } from 'react';
import { View } from 'react-native';

import type { DuoCameraViewProps } from '../types';

/**
 * Duo inner/outer camera preview with direction and smart-framing controls.
 *
 * @experimental The API may change in a minor release; see docs/API_STABILITY.md.
 */
export function DuoCameraView({
  location = 'outer',
  direction,
  source,
  smartFraming = 'off',
  onStateChange,
  style,
}: DuoCameraViewProps) {
  useEffect(() => {
    onStateChange?.({
      supported: false,
      available: false,
      running: false,
      status: 'unsupported',
      interrupted: false,
      interruptionReason: null,
      interruptionReasonCode: null,
      permission: 'undetermined',
      location,
      direction: direction ?? null,
      source: source ?? null,
      forwardCameraIds: [],
      backwardCameraIds: [],
      deviceId: null,
      deviceName: null,
      previewRotation: null,
      sensorCompensationSupported: false,
      sensorCompensationDisabled: false,
      aspectRatios: [],
      selectedAspectRatio: null,
      smartFraming: {
        supported: false,
        monitoring: false,
        mode: smartFraming,
        recommended: null,
      },
      error: null,
      errorDetails: null,
    });
  }, [direction, location, onStateChange, smartFraming, source]);
  return <View style={style} />;
}
