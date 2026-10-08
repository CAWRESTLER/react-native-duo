import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { DuoAdaptiveToolbarProps, DuoToolbarState } from '../types';

/**
 * Adaptive native tabs, navigation actions, and tools that move to the vertical axis on iPhone Duo.
 *
 * @experimental The API may change in a minor release; see docs/API_STABILITY.md.
 */
export function DuoAdaptiveToolbar({
  children,
  items,
  title,
  tintColor,
  showsNavigationBar = true,
  contentLayout = 'safeArea',
  background,
  onItemPress,
  onStateChange,
  style,
  contentStyle,
}: DuoAdaptiveToolbarProps) {
  const actionItems = items.filter((item) => item.placement !== 'tab');
  const tabItems = items.filter((item) => item.placement === 'tab');
  const hasTitle = showsNavigationBar && Boolean(title);
  const hasActions = actionItems.length > 0;
  const hasTabs = tabItems.length > 0;
  const isEdgeToEdge = contentLayout === 'edgeToEdge';
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const [barHeights, setBarHeights] = useState({
    title: 0,
    toolbar: 0,
    tabs: 0,
  });
  const handleHostLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    setHostSize((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height }
    );
  }, []);
  const handleBarLayout = useCallback(
    (bar: keyof typeof barHeights, { nativeEvent }: LayoutChangeEvent) => {
      const { height } = nativeEvent.layout;
      setBarHeights((previous) =>
        previous[bar] === height ? previous : { ...previous, [bar]: height }
      );
    },
    []
  );
  const topInset = hasTitle ? barHeights.title : 0;
  const bottomInset =
    (hasActions ? barHeights.toolbar : 0) + (hasTabs ? barHeights.tabs : 0);
  const state = useMemo<DuoToolbarState>(
    () => ({
      native: false,
      verticalBarEdge: 'unavailable',
      isVertical: false,
      // The fallback reports its own visible bars, not device system insets.
      contentInsets: { top: topInset, right: 0, bottom: bottomInset, left: 0 },
      ...(hostSize.width > 0 && hostSize.height > 0
        ? { contentSize: hostSize }
        : {}),
    }),
    [topInset, bottomInset, hostSize]
  );
  const lastEmittedState = useRef<DuoToolbarState | undefined>(undefined);
  useEffect(() => {
    // Inline callbacks often change when the parent stores this state. Do not
    // emit an unchanged measurement again and cause a parent render loop.
    if (onStateChange && lastEmittedState.current !== state) {
      lastEmittedState.current = state;
      onStateChange(state);
    }
  }, [onStateChange, state]);

  return (
    <View onLayout={handleHostLayout} style={[styles.container, style]}>
      {background !== undefined ? (
        <View
          accessibilityElementsHidden
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {background}
        </View>
      ) : null}
      {hasTitle ? (
        <Text
          onLayout={(event) => handleBarLayout('title', event)}
          style={styles.title}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.content,
          contentStyle,
          isEdgeToEdge && styles.edgeToEdgeContent,
        ]}
      >
        {children}
      </View>
      {isEdgeToEdge ? (
        <View pointerEvents="none" style={styles.content} />
      ) : null}
      {hasActions ? (
        <View
          onLayout={(event) => handleBarLayout('toolbar', event)}
          style={styles.toolbar}
        >
          {actionItems.map((item) => (
            <Pressable
              accessibilityRole="button"
              disabled={item.disabled}
              key={item.id}
              onPress={() => onItemPress?.(item.id)}
              style={[
                styles.item,
                item.selected && styles.selected,
                item.disabled && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.itemText,
                  tintColor ? { color: tintColor } : null,
                ]}
              >
                {item.title}
                {item.badge !== undefined ? ` (${item.badge})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {hasTabs ? (
        <View
          onLayout={(event) => handleBarLayout('tabs', event)}
          style={styles.tabs}
        >
          {tabItems.map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{
                disabled: item.disabled,
                selected: item.selected,
              }}
              disabled={item.disabled}
              key={item.id}
              onPress={() => onItemPress?.(item.id)}
              style={[
                styles.tab,
                item.selected && styles.selected,
                item.disabled && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.itemText,
                  tintColor ? { color: tintColor } : null,
                ]}
              >
                {item.title}
                {item.badge !== undefined ? ` (${item.badge})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', padding: 16, zIndex: 1 },
  content: { flex: 1 },
  edgeToEdgeContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  toolbar: {
    zIndex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c8c8cc',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabs: {
    zIndex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c8c8cc',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  item: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 10,
  },
  selected: { backgroundColor: '#dbeafe' },
  disabled: { opacity: 0.4 },
  itemText: { color: '#0a66c2', fontWeight: '600' },
});
