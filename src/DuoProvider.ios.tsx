import { useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { DuoContext, defaultDuoEnvironment } from './context';
import NativeDuoEnvironmentView from './native/DuoEnvironmentNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoEnvironment, DuoProviderProps } from './types';

export function DuoProvider({
  children,
  includeInactiveRegions = false,
  onEnvironmentChange,
  style,
}: DuoProviderProps) {
  const [environment, setEnvironment] = useState<DuoEnvironment>({
    ...defaultDuoEnvironment,
    platform: 'ios',
  });
  const environmentRef = useRef(environment);

  const handleEnvironmentChange = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const next = parseNativePayload<DuoEnvironment>(
        nativeEvent.payload,
        environmentRef.current
      );
      environmentRef.current = next;
      setEnvironment(next);
      onEnvironmentChange?.(next);
    },
    [onEnvironmentChange]
  );

  return (
    <DuoContext.Provider value={environment}>
      <NativeDuoEnvironmentView
        includeInactiveRegions={includeInactiveRegions}
        onEnvironmentChange={handleEnvironmentChange}
        style={[styles.fill, style]}
      >
        {children}
      </NativeDuoEnvironmentView>
    </DuoContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export function useDuo() {
  return useContext(DuoContext);
}

export function useDuoHinge() {
  return useDuo().hinge;
}

export function useDuoReservedRegions() {
  return useDuo().reservedRegions;
}

export function useDuoCameras() {
  return useDuo().cameras;
}
