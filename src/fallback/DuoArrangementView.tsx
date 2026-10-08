import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import {
  DuoContext,
  useDuoReservedRegions,
  type DuoMeasurableHost,
} from '../context';
import type { DuoArrangementState, DuoArrangementViewProps } from '../types';
import { resolveFoldSplit } from './foldSplit';

const paneState = { zIndex: 0, splitAxis: 'none' as const, isHidden: false };

export function DuoArrangementView({
  primary,
  secondary,
  arrangement = 'split',
  axes = 'automatic',
  primaryFraction = 0.5,
  overlayEdge = 'trailing',
  onStateChange,
  style,
  primaryStyle,
  secondaryStyle,
}: DuoArrangementViewProps) {
  const { width, height } = useWindowDimensions();
  const store = useContext(DuoContext);
  const regions = useDuoReservedRegions();
  const containerRef = useRef<DuoMeasurableHost | null>(null);
  const setContainer = useCallback((node: DuoMeasurableHost | null) => {
    containerRef.current = node;
  }, []);
  const [frame, setFrame] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Region frames are provider-local (Android foldables report them through
  // DuoProvider), so measure this container relative to the provider host.
  const measure = useCallback(() => {
    const container = containerRef.current;
    const host = store.host.current;
    if (!container || !host || regions.length === 0) return;
    host.measureInWindow((hostX, hostY) => {
      container.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        setFrame((previous) =>
          previous &&
          previous.x === x - hostX &&
          previous.y === y - hostY &&
          previous.width === measuredWidth &&
          previous.height === measuredHeight
            ? previous
            : {
                x: x - hostX,
                y: y - hostY,
                width: measuredWidth,
                height: measuredHeight,
              }
        );
      });
    });
  }, [regions.length, store]);
  useEffect(measure, [measure, regions]);

  const fold =
    arrangement === 'overlay' ? null : resolveFoldSplit(regions, frame, axes);
  const vertical = fold
    ? fold.direction === 'column'
    : axes === 'vertical' || (axes === 'automatic' && height > width);
  const fraction = Math.min(0.95, Math.max(0.05, primaryFraction));
  const state = useMemo<DuoArrangementState>(
    () => ({
      native: false,
      arrangement,
      primary: paneState,
      secondary: {
        ...paneState,
        zIndex: arrangement === 'overlay' ? 1 : 0,
        splitAxis: vertical ? 'vertical' : 'horizontal',
      },
    }),
    [arrangement, vertical]
  );

  useEffect(() => onStateChange?.(state), [onStateChange, state]);

  if (arrangement === 'overlay') {
    const secondaryPosition = overlayPosition[overlayEdge];
    return (
      <View ref={setContainer} style={[styles.container, style]}>
        <View style={[styles.fill, primaryStyle]}>{primary}</View>
        <View style={[styles.overlay, secondaryPosition, secondaryStyle]}>
          {secondary}
        </View>
      </View>
    );
  }

  if (fold) {
    const lengthKey = fold.direction === 'row' ? 'width' : 'height';
    return (
      <View
        onLayout={measure}
        ref={setContainer}
        style={[
          styles.container,
          fold.direction === 'row' ? styles.row : styles.column,
          style,
        ]}
      >
        <View
          style={[
            styles.pane,
            { [lengthKey]: fold.primaryLength },
            primaryStyle,
          ]}
        >
          {primary}
        </View>
        <View style={{ [lengthKey]: fold.gap }} />
        <View style={[styles.pane, styles.grow, secondaryStyle]}>
          {secondary}
        </View>
      </View>
    );
  }

  return (
    <View
      onLayout={measure}
      ref={setContainer}
      style={[styles.container, vertical ? styles.column : styles.row, style]}
    >
      <View style={[styles.pane, { flex: fraction }, primaryStyle]}>
        {primary}
      </View>
      <View style={[styles.pane, { flex: 1 - fraction }, secondaryStyle]}>
        {secondary}
      </View>
    </View>
  );
}

const overlayPosition = StyleSheet.create({
  top: { top: 12, left: 12, right: 12, maxHeight: '46%' },
  leading: { top: 12, bottom: 12, left: 12, width: '46%' },
  bottom: { bottom: 12, left: 12, right: 12, maxHeight: '46%' },
  trailing: { top: 12, right: 12, bottom: 12, width: '46%' },
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  pane: { overflow: 'hidden' },
  grow: { flex: 1 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  overlay: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
});
