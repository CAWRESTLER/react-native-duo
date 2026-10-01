import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDuoArrangementView from './native/DuoArrangementNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type {
  DuoArrangementState,
  DuoArrangementViewProps,
  DuoRect,
} from './types';

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
  const [paneFrames, setPaneFrames] = useState<{
    primary?: DuoRect;
    secondary?: DuoRect;
  }>({});
  const handleStateChange = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const fallback: DuoArrangementState = {
        native: false,
        arrangement,
        primary: { zIndex: 0, splitAxis: 'none', isHidden: false },
        secondary: { zIndex: 0, splitAxis: 'none', isHidden: false },
      };
      const next = parseNativePayload(nativeEvent.payload, fallback);
      setPaneFrames({
        primary: next.primary.frame,
        secondary: next.secondary.frame,
      });
      onStateChange?.(next);
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
      <View
        collapsable={false}
        style={[styles.pane, primaryStyle, paneSize(paneFrames.primary)]}
      >
        {primary}
      </View>
      <View
        collapsable={false}
        style={[styles.pane, secondaryStyle, paneSize(paneFrames.secondary)]}
      >
        {secondary}
      </View>
    </NativeDuoArrangementView>
  );
}

function paneSize(frame?: DuoRect) {
  return frame
    ? {
        width: frame.width,
        height: frame.height,
        right: undefined,
        bottom: undefined,
      }
    : undefined;
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
