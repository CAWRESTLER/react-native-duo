import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { defaultDuoEnvironment } from './context';
import NativeDuoEnvironmentView from './native/DuoEnvironmentNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type {
  DuoEnvironment,
  DuoGeometryState,
  DuoGeometryViewProps,
} from './types';

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
