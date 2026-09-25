import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDuoToolbarView from './native/DuoToolbarNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoAdaptiveToolbarProps, DuoToolbarState } from './types';

export function DuoAdaptiveToolbar({
  children,
  items,
  title,
  verticalBehavior = 'automatic',
  compressionBehavior = 'automatic',
  showsNavigationBar = true,
  onItemPress,
  onStateChange,
  style,
  contentStyle,
}: DuoAdaptiveToolbarProps) {
  const itemsJson = useMemo(() => JSON.stringify(items), [items]);
  const handlePress = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const value = parseNativePayload<{ id?: string }>(
        nativeEvent.payload,
        {}
      );
      if (value.id) onItemPress?.(value.id);
    },
    [onItemPress]
  );
  const handleState = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const fallback: DuoToolbarState = {
        native: false,
        verticalBarEdge: 'unavailable',
        isVertical: false,
      };
      onStateChange?.(parseNativePayload(nativeEvent.payload, fallback));
    },
    [onStateChange]
  );

  return (
    <NativeDuoToolbarView
      itemsJson={itemsJson}
      title={title}
      verticalBehavior={verticalBehavior}
      compressionBehavior={compressionBehavior}
      showsNavigationBar={showsNavigationBar}
      onItemPress={handlePress}
      onStateChange={handleState}
      style={[styles.fill, style]}
    >
      <View style={[styles.fill, contentStyle]}>{children}</View>
    </NativeDuoToolbarView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
