import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DuoAdaptiveToolbarProps, DuoToolbarState } from './types';

export function DuoAdaptiveToolbar({
  children,
  items,
  title,
  tintColor,
  onItemPress,
  onStateChange,
  style,
  contentStyle,
}: DuoAdaptiveToolbarProps) {
  const actionItems = items.filter((item) => item.placement !== 'tab');
  const tabItems = items.filter((item) => item.placement === 'tab');
  const state = useMemo<DuoToolbarState>(
    () => ({
      native: false,
      verticalBarEdge: 'unavailable',
      isVertical: false,
      contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    []
  );
  useEffect(() => onStateChange?.(state), [onStateChange, state]);

  return (
    <View style={[styles.container, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
      {actionItems.length ? (
        <View style={styles.toolbar}>
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
      {tabItems.length ? (
        <View style={styles.tabs}>
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
  title: { fontSize: 20, fontWeight: '700', padding: 16 },
  content: { flex: 1 },
  toolbar: {
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
