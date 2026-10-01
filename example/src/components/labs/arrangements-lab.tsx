import {
  DuoArrangementView,
  type DuoArrangementState,
} from '@cawrestler/react-native-duo';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Caption,
  Divider,
  SegmentedControl,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';

type ArrangementStyle = 'automatic' | 'split' | 'overlay';

const initialState: DuoArrangementState = {
  native: false,
  arrangement: 'split',
  primary: { zIndex: 0, splitAxis: 'none', isHidden: false },
  secondary: { zIndex: 0, splitAxis: 'none', isHidden: false },
};

export function ArrangementsLab() {
  const palette = useDuoPalette();
  const [style, setStyle] = useState<ArrangementStyle>('split');
  const [horizontalOnly, setHorizontalOnly] = useState(false);
  const [nativeState, setNativeState] = useState(initialState);
  const axes =
    style !== 'automatic' && horizontalOnly ? 'horizontal' : 'automatic';

  return (
    <View style={[styles.root, { backgroundColor: palette.grouped }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: palette.elevated, borderColor: palette.separator },
        ]}
      >
        <View style={styles.titleRow}>
          <Symbol
            color={palette.text}
            name="rectangle.3.group"
            size={38}
            weight="bold"
          />
          <Text style={[styles.title, { color: palette.text }]}>
            Arrangements
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: palette.secondary }]}>
          Two related views that adapt around the fold without custom pose
          checks.
        </Text>
        <SegmentedControl
          onChange={setStyle}
          options={[
            { label: 'Automatic', value: 'automatic' },
            { label: 'Split', value: 'split' },
            { label: 'Overlay', value: 'overlay' },
          ]}
          value={style}
        />
        <ToggleRow
          compact
          label="Restrict adaptation to horizontal axis"
          onChange={setHorizontalOnly}
          value={horizontalOnly}
        />
      </View>

      <View style={styles.arrangementHost}>
        <DuoArrangementView
          animated
          arrangement={style}
          axes={axes}
          onStateChange={setNativeState}
          overlayEdge="top"
          primary={
            style === 'overlay' ? (
              <OverlayQueuePanel zIndex={nativeState.primary.zIndex} />
            ) : (
              <PlayerPanel />
            )
          }
          secondary={style === 'overlay' ? <PlayerPanel /> : <QueuePanel />}
          style={styles.fill}
        />
      </View>
    </View>
  );
}

function PlayerPanel() {
  const palette = useDuoPalette();
  const [paneSize, setPaneSize] = useState({ width: 0, height: 0 });
  const [songHeight, setSongHeight] = useState(52);
  // SwiftUI's aspect-fit artwork respects both the pane width and the space
  // left after the labels/transport. A width-only aspect ratio can overflow
  // a short native pane during folding or an overlay transition.
  const artworkWidth = Math.min(
    Math.max(0, paneSize.width - 40),
    Math.max(0, paneSize.height - 40 - songHeight - 38 - 36) * 1.4
  );
  return (
    <View
      onLayout={({ nativeEvent }) => {
        const { width, height } = nativeEvent.layout;
        setPaneSize((previous) =>
          previous.width === width && previous.height === height
            ? previous
            : { width, height }
        );
      }}
      style={[styles.player, { backgroundColor: palette.surface }]}
    >
      <View style={[styles.album, { width: artworkWidth }]}>
        <Symbol color="#FFFFFF" name="waveform" size={54} weight="light" />
      </View>
      <View
        onLayout={({ nativeEvent }) => setSongHeight(nativeEvent.layout.height)}
        style={styles.songCopy}
      >
        <Text
          numberOfLines={1}
          style={[styles.songTitle, { color: palette.text }]}
        >
          Above the Fold
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.songSubtitle, { color: palette.secondary }]}
        >
          Duo Lab Sessions
        </Text>
      </View>
      <View style={styles.transport}>
        <Symbol color={palette.text} name="backward.fill" size={28} />
        <Symbol color={palette.text} name="pause.circle.fill" size={38} />
        <Symbol color={palette.text} name="forward.fill" size={28} />
      </View>
    </View>
  );
}

const tracks = ['Open Wide', 'Book Mode', 'Tabletop', 'Tentatively Yours'];

function QueuePanel() {
  const palette = useDuoPalette();
  return (
    <View style={[styles.queue, { backgroundColor: palette.surface }]}>
      <Text style={[styles.queueTitle, { color: palette.text }]}>Up Next</Text>
      {tracks.map((track, index) => (
        <View key={track} style={styles.trackGroup}>
          <View style={styles.track}>
            <Text style={[styles.trackNumber, { color: palette.secondary }]}>
              {index + 1}
            </Text>
            <View style={styles.trackCopy}>
              <Text
                numberOfLines={1}
                style={[styles.trackTitle, { color: palette.text }]}
              >
                {track}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.trackSubtitle, { color: palette.secondary }]}
              >
                Duo Lab Sessions
              </Text>
            </View>
            <Symbol
              color={palette.tertiary}
              name="line.3.horizontal"
              size={17}
            />
          </View>
          {index < tracks.length - 1 ? <Divider /> : null}
        </View>
      ))}
    </View>
  );
}

function OverlayQueuePanel({ zIndex }: { zIndex: number }) {
  const palette = useDuoPalette();
  return (
    <View
      style={[
        styles.overlayQueue,
        zIndex > 0 && styles.miniQueue,
        { backgroundColor: palette.surface },
      ]}
    >
      <View style={styles.overlayHeader}>
        <Symbol color={palette.text} name="music.note.list" size={17} />
        <Text style={[styles.overlayTitle, { color: palette.text }]}>
          {zIndex > 0 ? 'Mini Queue' : 'Expanded Queue'}
        </Text>
        <View style={[styles.zBadge, { backgroundColor: palette.elevated }]}>
          <Caption>z {zIndex}</Caption>
        </View>
      </View>
      {zIndex <= 0 ? (
        <QueuePanel />
      ) : (
        <Text style={[styles.miniQueueSubtitle, { color: palette.secondary }]}>
          Open Wide • Duo Lab Sessions
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: { padding: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 33 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 22 },
  arrangementHost: { flex: 1, minHeight: 0 },
  fill: { flex: 1 },
  player: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 20,
  },
  album: {
    aspectRatio: 1.4,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#6155F5',
    backgroundImage: 'linear-gradient(to bottom, #9084FF, #6155F5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songCopy: { alignItems: 'center', gap: 4 },
  songTitle: { fontSize: 22, fontWeight: '700' },
  songSubtitle: { fontSize: 17, lineHeight: 22 },
  transport: { flexDirection: 'row', alignItems: 'center', gap: 30 },
  queue: { flex: 1, minHeight: 0, padding: 20, gap: 14 },
  queueTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  trackGroup: { gap: 14 },
  track: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackNumber: {
    width: 20,
    fontSize: 12,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  trackCopy: { flex: 1, gap: 2 },
  trackTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  trackSubtitle: { fontSize: 12 },
  overlayQueue: { flex: 1, padding: 16, gap: 12 },
  miniQueue: { maxHeight: 120 },
  miniQueueSubtitle: { fontSize: 15, lineHeight: 20 },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  overlayTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  zBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
});
