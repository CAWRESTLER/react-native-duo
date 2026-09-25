import { useContext, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { DuoContext, defaultDuoEnvironment } from './context';
import type { DuoProviderProps } from './types';

export function DuoProvider({
  children,
  onEnvironmentChange,
  style,
}: DuoProviderProps) {
  const window = useWindowDimensions();
  const environment = useMemo(
    () => ({
      ...defaultDuoEnvironment,
      platform:
        Platform.OS === 'android' ? ('android' as const) : ('web' as const),
      window: {
        width: window.width,
        height: window.height,
        scale: window.scale,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
    [window.height, window.scale, window.width]
  );

  useEffect(
    () => onEnvironmentChange?.(environment),
    [environment, onEnvironmentChange]
  );

  return (
    <DuoContext.Provider value={environment}>
      <View style={[styles.fill, style]}>{children}</View>
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
