import { DuoGeometryView, useDuo } from '@cawrestler/react-native-duo';
import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AvailabilityRow,
  BodyText,
  Caption,
  DemoPage,
  LabCard,
  MetricPill,
  StatusLine,
} from '@/components/duo-ui';

export function OverviewLab() {
  const duo = useDuo();
  const [scenePhase, setScenePhase] = useState(
    scenePhaseFor(AppState.currentState)
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setScenePhase(scenePhaseFor(state));
    });
    return () => subscription.remove();
  }, []);

  return (
    <DemoPage
      subtitle="A hands-on map of the iOS 27.1 Duo APIs"
      symbol="iphone.gen3.radiowaves.left.and.right"
      title="iPhone Duo API Lab"
    >
      <DuoGeometryView
        includeInactiveRegions
        style={styles.environmentGeometry}
      >
        {(geometry) => (
          <View>
            <LabCard symbol="waveform.path.ecg" title="Live environment">
              <View style={styles.metrics}>
                <MetricPill
                  label="Horizontal"
                  value={sizeClassLabel(duo.horizontalSizeClass)}
                />
                <MetricPill
                  label="Vertical"
                  value={sizeClassLabel(duo.verticalSizeClass)}
                />
              </View>
              <View style={styles.metrics}>
                <MetricPill
                  color="#007AFF"
                  label="Width"
                  value={`${Math.trunc(geometry.width)} pt`}
                />
                <MetricPill
                  color="#007AFF"
                  label="Height"
                  value={`${Math.round(geometry.height)} pt`}
                />
              </View>
              <StatusLine active={duo.supportsMultipleWindows}>
                {duo.supportsMultipleWindows
                  ? 'Host supports additional scenes'
                  : 'Host does not enable additional scenes'}
              </StatusLine>
              <Caption>
                Scene: {scenePhase} •{' '}
                {
                  geometry.reservedRegions.filter(
                    (region) => region.kind === 'division'
                  ).length
                }{' '}
                division region(s) •{' '}
                {
                  geometry.reservedRegions.filter(
                    (region) => region.kind === 'occlusion'
                  ).length
                }{' '}
                occlusion region(s)
              </Caption>
            </LabCard>
          </View>
        )}
      </DuoGeometryView>

      <LabCard symbol="checklist" title="What is covered">
        <AvailabilityRow
          available
          title="Hinge telemetry"
          detail="Live hinge status and continuous angle"
        />
        <AvailabilityRow
          available
          title="Adaptive geometry"
          detail="Reserved regions, local geometry, and safe areas"
        />
        <AvailabilityRow
          available
          title="Arrangement views"
          detail="Native split and overlay arrangements with z-index feedback"
        />
        <AvailabilityRow
          available
          title="Vertical bars"
          detail="Axis behavior, compression, priority, and live edge state"
        />
        <AvailabilityRow
          available={false}
          title="Multiple scenes"
          detail="Accessory scenes work; independent WindowGroup sessions are the remaining package gap"
        />
        <AvailabilityRow
          available
          title="Duo camera"
          detail="Inner/outer cameras, direction coordinator, smart framing, and accessory"
        />
      </LabCard>

      <LabCard symbol="rotate.3d" title="Testing tip">
        <BodyText secondary>
          Use Device Hub to move iPhone Duo between closed, book, tabletop,
          tent, and fully open poses. Keep this app visible while changing poses
          to see every lab react live.
        </BodyText>
      </LabCard>
      <LabCard
        symbol="square.stack.3d.up"
        title="Native navigation integration"
      >
        <BodyText secondary>
          Try existing native tabs and stacks, a real back button, a modal, and
          a shared draft while folding.
        </BodyText>
        <Link href="/navigation" asChild>
          <Pressable accessibilityRole="button">
            <Text>Open navigation example →</Text>
          </Pressable>
        </Link>
      </LabCard>
    </DemoPage>
  );
}

function sizeClassLabel(sizeClass: string) {
  return sizeClass.charAt(0).toUpperCase() + sizeClass.slice(1);
}

function scenePhaseFor(state: string | null | undefined) {
  return state === 'background'
    ? 'background'
    : state === 'inactive'
      ? 'inactive'
      : 'active';
}

const styles = StyleSheet.create({
  environmentGeometry: { minHeight: 250 },
  metrics: { flexDirection: 'row', gap: 8 },
});
