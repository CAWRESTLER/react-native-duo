import { useCallback } from 'react';

import NativeDuoCameraView from './native/DuoCameraNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoCameraViewProps, DuoCameraViewState } from './types';

export function DuoCameraView({
  location = 'outer',
  direction,
  source,
  dynamicAspectRatio,
  sensorOrientationCompensation = true,
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
      };
      onStateChange?.(parseNativePayload(nativeEvent.payload, fallback));
    },
    [direction, location, onStateChange, smartFraming, source]
  );

  return (
    <NativeDuoCameraView
      location={location}
      direction={direction}
      cameraSource={source}
      dynamicAspectRatio={dynamicAspectRatio}
      sensorOrientationCompensation={sensorOrientationCompensation}
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
