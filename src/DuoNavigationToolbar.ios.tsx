import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDuoNavigationToolbarView from './native/DuoNavigationToolbarNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import {
  resolveToolbarContentFrame,
  resolveToolbarLayoutInsets,
} from './native/layout';
import {
  isNavigationToolbarState,
  navigationToolbarItems,
} from './native/navigation';
import type {
  DuoNavigationToolbarProps,
  DuoNavigationToolbarState,
} from './types';

const initialState: DuoNavigationToolbarState = {
  native: false,
  attachment: 'inactive',
  verticalBarEdge: 'unavailable',
  isVertical: false,
  contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
};

export function DuoNavigationToolbar({
  children,
  items,
  active = true,
  tintColor,
  compressionBehavior = 'automatic',
  horizontalPresentation = 'navigator',
  contentLayout = 'safeArea',
  background,
  onItemPress,
  onStateChange,
  style,
  contentStyle,
}: DuoNavigationToolbarProps) {
  const [state, setState] = useState(initialState);
  const itemsJson = useMemo(
    () => JSON.stringify(navigationToolbarItems(items)),
    [items]
  );
  const handlePress = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const event = parseNativePayload<{ id?: string }>(
        nativeEvent.payload,
        {}
      );
      if (active && typeof event.id === 'string' && event.id.length)
        onItemPress?.(event.id);
    },
    [active, onItemPress]
  );
  const handleState = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const next = parseNativePayload<unknown>(nativeEvent.payload, null);
      if (
        !isNavigationToolbarState(next) ||
        (!active && next.attachment === 'attached')
      )
        return;
      setState(next);
      onStateChange?.(next);
    },
    [active, onStateChange]
  );
  const frame = resolveToolbarContentFrame(
    state.contentSize,
    state.contentInsets,
    contentLayout
  );
  const insets = resolveToolbarLayoutInsets(state.contentInsets, contentLayout);
  const layout = frame
    ? { top: frame.y, left: frame.x, width: frame.width, height: frame.height }
    : {
        top: insets.top,
        left: insets.left,
        bottom: insets.bottom,
        right: insets.right,
      };

  return (
    <NativeDuoNavigationToolbarView
      itemsJson={itemsJson}
      active={active}
      barTintColor={tintColor}
      compressionBehavior={compressionBehavior}
      horizontalPresentation={horizontalPresentation}
      onItemPress={handlePress}
      onStateChange={handleState}
      style={[styles.fill, style]}
    >
      <View collapsable={false} pointerEvents="box-none" style={styles.fill}>
        {background !== undefined ? (
          <View
            collapsable={false}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={StyleSheet.absoluteFill}
          >
            {background}
          </View>
        ) : null}
        <View
          collapsable={false}
          style={[styles.content, layout, contentStyle]}
        >
          {children}
        </View>
      </View>
    </NativeDuoNavigationToolbarView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { position: 'absolute' },
});
