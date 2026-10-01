import { useEffect } from 'react';
import { View } from 'react-native';

import type { DuoCameraViewProps } from './types';

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
    });
  }, [direction, location, onStateChange, smartFraming, source]);
  return <View style={style} />;
}
