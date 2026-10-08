import { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  createDuoEnvironmentStore,
  DuoContext,
  defaultDuoEnvironment,
  type DuoEnvironmentStore,
} from '../context';
import type { DuoEnvironment, DuoProviderProps } from '../types';
import NativeDuoEnvironmentView from './DuoEnvironmentNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './events';

/**
 * Provider backed by the native environment view: UIKit Duo APIs on iOS and
 * Jetpack WindowManager foldable posture on Android.
 */

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
      platform: Platform.OS === 'android' ? 'android' : 'ios',
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
        <View
          collapsable={false}
          ref={(host) => {
            store.host.current = host;
          }}
          style={styles.fill}
        >
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
} from '../context';
