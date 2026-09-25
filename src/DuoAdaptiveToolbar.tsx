import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DuoAdaptiveToolbarProps, DuoToolbarState } from './types';

export function DuoAdaptiveToolbar({
  children,
  items,
  title,
  onItemPress,
  onStateChange,
  style,
  contentStyle,
}: DuoAdaptiveToolbarProps) {
  const state = useMemo<DuoToolbarState>(
    () => ({
      native: false,
      verticalBarEdge: 'unavailable',
      isVertical: false,
    }),
    []
  );
  useEffect(() => onStateChange?.(state), [onStateChange, state]);

  return (
    <View style={[styles.container, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
      <View style={styles.toolbar}>
        {items.map((item) => (
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
            <Text style={styles.itemText}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
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
  item: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  selected: { backgroundColor: '#dbeafe' },
  disabled: { opacity: 0.4 },
  itemText: { color: '#0a66c2', fontWeight: '600' },
});
