import {
  DuoGeometryView,
  type DuoReservedRegion,
} from '@cawrestler/react-native-duo';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BodyText,
  Caption,
  DemoPage,
  Divider,
  LabCard,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';

export function RegionsLab() {
  const palette = useDuoPalette();
  const [includeInactive, setIncludeInactive] = useState(true);

  return (
    <DemoPage
      subtitle="Inspect the fold and camera areas in local geometry"
      symbol="rectangle.split.2x1"
      title="Reserved Regions"
    >
      <View style={styles.toggleInset}>
        <ToggleRow
          label="Include inactive regions"
          onChange={setIncludeInactive}
          value={includeInactive}
        />
      </View>

      <DuoGeometryView
        includeInactiveRegions={includeInactive}
        style={styles.stageGeometry}
      >
        {(geometry) => (
          <View
            style={[
              styles.stage,
              {
                experimental_backgroundImage: `linear-gradient(to bottom right, ${palette.indigo}2E, #AF52DE14)`,
              },
            ]}
          >
            <View style={styles.stageMessage}>
              <Symbol
                color={palette.text}
                name="arrow.up.left.and.arrow.down.right"
                size={34}
              />
              <Text style={[styles.stageTitle, { color: palette.text }]}>
                Resize or change the device pose
              </Text>
              <Text style={[styles.stageBody, { color: palette.secondary }]}>
                Colored overlays are the exact local frames returned by
                DuoGeometryView.
              </Text>
            </View>
            {geometry.reservedRegions.map((region) => (
              <RegionOverlay
                key={`${region.kind}-${region.id}`}
                region={region}
              />
            ))}
            <View
              style={[
                styles.sizeBadge,
                { backgroundColor: `${palette.surface}CC` },
              ]}
            >
              <Text style={[styles.numericCaption, { color: palette.text }]}>
                {Math.trunc(geometry.width)} × {Math.trunc(geometry.height)}
              </Text>
            </View>
          </View>
        )}
      </DuoGeometryView>

      <DuoGeometryView
        includeInactiveRegions={includeInactive}
        style={styles.reportGeometry}
      >
        {(geometry) => (
          <View>
            <LabCard symbol="list.bullet.rectangle" title="Region report">
              <RegionSummary
                color={palette.orange}
                regions={geometry.reservedRegions.filter(
                  (region) => region.kind === 'division'
                )}
                title="Division"
              />
              <Divider />
              <RegionSummary
                color={palette.pink}
                regions={geometry.reservedRegions.filter(
                  (region) => region.kind === 'occlusion'
                )}
                title="Occlusion"
              />
              <Text
                style={[styles.numericCaption, { color: palette.secondary }]}
              >
                Safe-area insets — top {Math.trunc(geometry.safeAreaInsets.top)}
                , leading {Math.trunc(geometry.safeAreaInsets.left)}, bottom{' '}
                {Math.trunc(geometry.safeAreaInsets.bottom)}, trailing{' '}
                {Math.trunc(geometry.safeAreaInsets.right)}
              </Text>
            </LabCard>
          </View>
        )}
      </DuoGeometryView>

      <LabCard symbol="scope" title="Query semantics">
        <BodyText secondary>
          Division regions split usable content, such as an active fold.
          Occlusion regions cover content, such as the inner camera. Inactive
          results are useful for choosing a stable high-level layout before the
          hardware area becomes active.
        </BodyText>
      </LabCard>
    </DemoPage>
  );
}

function RegionOverlay({ region }: { region: DuoReservedRegion }) {
  const palette = useDuoPalette();
  const color = region.kind === 'division' ? palette.orange : palette.pink;
  const width = Math.max(region.frame.width, 2);
  const height = Math.max(region.frame.height, 2);
  return (
    <View
      accessibilityLabel={`${region.kind.toUpperCase()}, ${region.isActive ? 'active' : 'inactive'}`}
      pointerEvents="none"
      style={[
        styles.region,
        {
          backgroundColor: `${color}${region.isActive ? '6B' : '29'}`,
          borderColor: color,
          borderStyle: region.isActive ? 'solid' : 'dashed',
          left: region.frame.x + (region.frame.width - width) / 2,
          top: region.frame.y + (region.frame.height - height) / 2,
          width,
          height,
        },
      ]}
    >
      <Text style={[styles.regionLabel, { color }]}>
        {region.kind.toUpperCase()}
      </Text>
    </View>
  );
}

function RegionSummary({
  title,
  color,
  regions,
}: {
  title: string;
  color: string;
  regions: DuoReservedRegion[];
}) {
  const palette = useDuoPalette();
  return (
    <View style={styles.summary}>
      <View style={styles.summaryHeader}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.summaryTitle, { color: palette.text }]}>
          {title} regions
        </Text>
        <Text style={[styles.count, { color: palette.secondary }]}>
          {regions.length}
        </Text>
      </View>
      {regions.length === 0 ? <Caption>None reported</Caption> : null}
      {regions.map((region) => (
        <View key={region.id} style={styles.regionSummary}>
          <Text style={[styles.numericCaption, { color: palette.secondary }]}>
            {region.isActive ? 'active' : 'inactive'} • x{' '}
            {Math.trunc(region.frame.x)}, y {Math.trunc(region.frame.y)}, w{' '}
            {Math.trunc(region.frame.width)}, h{' '}
            {Math.trunc(region.frame.height)}
          </Text>
          <Text style={[styles.numericCaption, { color: palette.secondary }]}>
            margins t {Math.trunc(region.margins.top)}, l{' '}
            {Math.trunc(region.margins.left)}, b{' '}
            {Math.trunc(region.margins.bottom)}, r{' '}
            {Math.trunc(region.margins.right)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleInset: { paddingHorizontal: 4 },
  stageGeometry: { height: 340 },
  reportGeometry: { minHeight: 250 },
  stage: { flex: 1, borderRadius: 24, borderCurve: 'continuous' },
  stageMessage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  stageTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  stageBody: { fontSize: 12, lineHeight: 15, textAlign: 'center' },
  sizeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 999,
    padding: 8,
  },
  region: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionLabel: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
    width: 85,
    textAlign: 'center',
  },
  summary: { gap: 8 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 8 },
  summaryTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  count: { fontSize: 17 },
  regionSummary: { gap: 2 },
  numericCaption: {
    fontSize: 12,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  },
});
