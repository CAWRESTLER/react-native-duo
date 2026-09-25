import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDuoArrangementView from './native/DuoArrangementNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoArrangementState, DuoArrangementViewProps } from './types';

export function DuoArrangementView({
  primary,
  secondary,
  arrangement = 'split',
  axes = 'automatic',
  primaryFraction = 0.5,
  overlayEdge = 'trailing',
  animated = true,
  onStateChange,
  style,
  primaryStyle,
  secondaryStyle,
}: DuoArrangementViewProps) {
  const handleStateChange = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const fallback: DuoArrangementState = {
        native: false,
        arrangement,
        primary: { zIndex: 0, splitAxis: 'none', isHidden: false },
        secondary: { zIndex: 0, splitAxis: 'none', isHidden: false },
      };
      onStateChange?.(parseNativePayload(nativeEvent.payload, fallback));
    },
    [arrangement, onStateChange]
  );

  return (
    <NativeDuoArrangementView
      arrangement={arrangement}
      axes={axes}
      primaryFraction={Math.min(0.95, Math.max(0.05, primaryFraction))}
      overlayEdge={overlayEdge}
      animated={animated}
      onStateChange={handleStateChange}
      style={[styles.container, style]}
    >
      <View style={[styles.pane, primaryStyle]}>{primary}</View>
      <View style={[styles.pane, secondaryStyle]}>{secondary}</View>
    </NativeDuoArrangementView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  pane: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
});
