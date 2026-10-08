import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { defaultDuoEnvironment } from '../context';
import type {
  DuoEnvironment,
  DuoGeometryState,
  DuoGeometryViewProps,
} from '../types';
import NativeDuoEnvironmentView from './DuoEnvironmentNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './events';

/**
 * View-local geometry from the native environment view: UIKit reserved
 * regions on iOS and the Jetpack WindowManager fold on Android.
 */
export function DuoGeometryView({
  children,
  includeInactiveRegions = false,
  onGeometryChange,
  style,
}: DuoGeometryViewProps) {
  const [geometry, setGeometry] = useState<DuoGeometryState>(
    defaultDuoEnvironment.geometry
  );
  const handleChange = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const environment = parseNativePayload<DuoEnvironment>(
        nativeEvent.payload,
        defaultDuoEnvironment
      );
      setGeometry(environment.geometry);
      onGeometryChange?.(environment.geometry);
    },
    [onGeometryChange]
  );

  return (
    <NativeDuoEnvironmentView
      includeInactiveRegions={includeInactiveRegions}
      onEnvironmentChange={handleChange}
      style={style}
    >
      <View collapsable={false} style={styles.fill}>
        {typeof children === 'function' ? children(geometry) : children}
      </View>
    </NativeDuoEnvironmentView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
