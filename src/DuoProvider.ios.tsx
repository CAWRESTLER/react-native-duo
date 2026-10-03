import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  createDuoEnvironmentStore,
  DuoContext,
  defaultDuoEnvironment,
  type DuoEnvironmentStore,
} from './context';
import NativeDuoEnvironmentView from './native/DuoEnvironmentNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoEnvironment, DuoProviderProps } from './types';

export function DuoProvider({
  children,
  includeInactiveRegions = false,
  onEnvironmentChange,
  style,
}: DuoProviderProps) {
  const storeRef = useRef<DuoEnvironmentStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDuoEnvironmentStore({
      ...defaultDuoEnvironment,
      platform: 'ios',
    });
  }
  const store = storeRef.current;

  const handleEnvironmentChange = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const next = parseNativePayload<DuoEnvironment>(
        nativeEvent.payload,
        store.getSnapshot()
      );
      const snapshot = store.update(next);
      onEnvironmentChange?.(snapshot);
    },
    [onEnvironmentChange, store]
  );

  return (
    <DuoContext.Provider value={store}>
      <NativeDuoEnvironmentView
        includeInactiveRegions={includeInactiveRegions}
        onEnvironmentChange={handleEnvironmentChange}
        style={[styles.fill, style]}
      >
        {/* The native sensor sizes exactly one child. Keep this host stable and
            non-collapsing when consumers supply siblings or RN Modal hosts. */}
        <View collapsable={false} style={styles.fill}>
          {children}
        </View>
      </NativeDuoEnvironmentView>
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
