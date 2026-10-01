import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDuoToolbarView from './native/DuoToolbarNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import { resolveToolbarContentFrame } from './native/layout';
import type { DuoAdaptiveToolbarProps, DuoToolbarState } from './types';

export function DuoAdaptiveToolbar({
  children,
  items,
  title,
  tintColor,
  verticalBehavior = 'automatic',
  compressionBehavior = 'automatic',
  showsNavigationBar = true,
  onItemPress,
  onStateChange,
  style,
  contentStyle,
}: DuoAdaptiveToolbarProps) {
  const [nativeState, setNativeState] = useState<DuoToolbarState>({
    native: false,
    verticalBarEdge: 'unavailable',
    isVertical: false,
    contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  });
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
        contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      };
      const nextState = parseNativePayload(nativeEvent.payload, fallback);
      setNativeState(nextState);
      onStateChange?.(nextState);
    },
    [onStateChange]
  );
  const contentFrame = useMemo(
    () =>
      resolveToolbarContentFrame(
        nativeState.contentSize,
        nativeState.contentInsets
      ),
    [nativeState.contentSize, nativeState.contentInsets]
  );
  const automaticLayout = useMemo(
    () =>
      contentFrame
        ? {
            top: contentFrame.y,
            left: contentFrame.x,
            width: contentFrame.width,
            height: contentFrame.height,
          }
        : {
            top: nativeState.contentInsets.top,
            right: nativeState.contentInsets.right,
            bottom: nativeState.contentInsets.bottom,
            left: nativeState.contentInsets.left,
          },
    [contentFrame, nativeState.contentInsets]
  );
  const nativeViewport = useMemo(
    () =>
      contentFrame && nativeState.contentSize
        ? {
            flex: 0,
            width: nativeState.contentSize.width,
            height: nativeState.contentSize.height,
          }
        : undefined,
    [contentFrame, nativeState.contentSize]
  );

  return (
    <NativeDuoToolbarView
      itemsJson={itemsJson}
      title={title}
      barTintColor={tintColor}
      verticalBehavior={verticalBehavior}
      compressionBehavior={compressionBehavior}
      showsNavigationBar={showsNavigationBar}
      onItemPress={handlePress}
      onStateChange={handleState}
      style={[styles.fill, style]}
    >
      <View
        collapsable={false}
        pointerEvents="box-none"
        style={[styles.fill, nativeViewport]}
      >
        <View
          collapsable={false}
          style={[styles.insetContent, automaticLayout, contentStyle]}
        >
          {children}
        </View>
      </View>
    </NativeDuoToolbarView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  insetContent: { position: 'absolute' },
});
