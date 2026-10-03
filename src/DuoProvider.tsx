import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import {
  createDuoEnvironmentStore,
  DuoContext,
  defaultDuoEnvironment,
  type DuoEnvironmentStore,
} from './context';
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
      geometry: {
        ...defaultDuoEnvironment.geometry,
        width: window.width,
        height: window.height,
      },
      window: {
        width: window.width,
        height: window.height,
        scale: window.scale,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
    [window.height, window.scale, window.width]
  );
  const storeRef = useRef<DuoEnvironmentStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDuoEnvironmentStore(environment);
  }
  const store = storeRef.current;

  useEffect(() => {
    const snapshot = store.update(environment);
    onEnvironmentChange?.(snapshot);
  }, [environment, onEnvironmentChange, store]);

  return (
    <DuoContext.Provider value={store}>
      <View collapsable={false} style={[styles.fill, style]}>
        {children}
      </View>
    </DuoContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export {
  useDuo,
  useDuoCameras,
  useDuoGeometry,
  useDuoHinge,
  useDuoReservedRegions,
  useDuoWindow,
} from './context';
