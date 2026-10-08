import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { defaultDuoEnvironment } from '../context';
import type { DuoGeometryState, DuoGeometryViewProps } from '../types';

export function DuoGeometryView({
  children,
  onGeometryChange,
  style,
}: DuoGeometryViewProps) {
  const [geometry, setGeometry] = useState<DuoGeometryState>(
    defaultDuoEnvironment.geometry
  );
  const handleLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      const next = {
        ...defaultDuoEnvironment.geometry,
        width: layout.width,
        height: layout.height,
      };
      setGeometry(next);
      onGeometryChange?.(next);
    },
    [onGeometryChange]
  );

  return (
    <View onLayout={handleLayout} style={style}>
      {typeof children === 'function' ? children(geometry) : children}
    </View>
  );
}
