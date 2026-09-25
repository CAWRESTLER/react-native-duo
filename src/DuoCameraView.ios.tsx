import { useCallback } from 'react';

import NativeDuoCameraView from './native/DuoCameraNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoCameraViewProps, DuoCameraViewState } from './types';

export function DuoCameraView({
  location = 'outer',
  direction,
  active = true,
  requestPermission = false,
  mirrored = false,
  resizeMode = 'cover',
  smartFraming = 'off',
  onStateChange,
  style,
}: DuoCameraViewProps) {
  const handleState = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const fallback: DuoCameraViewState = {
        supported: false,
        available: false,
        running: false,
        permission: 'undetermined',
        location,
        direction: direction ?? null,
        forwardCameraIds: [],
        backwardCameraIds: [],
        deviceId: null,
        deviceName: null,
        smartFraming: {
          supported: false,
          monitoring: false,
          mode: smartFraming,
          recommended: null,
        },
        error: null,
      };
      onStateChange?.(parseNativePayload(nativeEvent.payload, fallback));
    },
    [direction, location, onStateChange, smartFraming]
  );

  return (
    <NativeDuoCameraView
      location={location}
      direction={direction}
      active={active}
      requestPermission={requestPermission}
      mirrored={mirrored}
      resizeMode={resizeMode}
      smartFraming={smartFraming}
      onStateChange={handleState}
      style={style}
    />
  );
}
