import {
  DuoGeometryView,
  DuoProvider,
  DuoSceneAccessory,
  useDuo,
  type DuoSceneAccessoryState,
} from '@cawrestler/react-native-duo';
import { useEffect, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BodyText,
  Caption,
  DemoPage,
  LabCard,
  MetricPill,
  PrimaryButton,
  StatusLine,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';

const initialState: DuoSceneAccessoryState = {
  supported: false,
  registered: false,
  available: false,
  enabled: true,
  kind: 'externalDisplay',
};

export function ScenesLab() {
  const duo = useDuo();
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [scenePhase, setScenePhase] = useState(AppState.currentState);
  const [accessoryEnabled, setAccessoryEnabled] = useState(true);
  const [accessory, setAccessory] = useState(initialState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setScenePhase);
    return () => subscription.remove();
  }, []);

  const openDiagnostics = () => {
    setDiagnosticsVisible(true);
  };

  return (
    <>
      <DemoPage
        subtitle="Exercise iPhone Duo's multiple-window support"
        symbol="macwindow.on.rectangle"
        title="Scenes"
      >
        <LabCard symbol="switch.2" title="Dynamic availability">
          <StatusLine active={duo.supportsMultipleWindows}>
            {duo.supportsMultipleWindows
              ? 'Host supports additional scenes'
              : 'Host does not enable additional scenes'}
          </StatusLine>
          <Caption>Scene phase: {scenePhase ?? 'unknown'}</Caption>
        </LabCard>

        <LabCard symbol="plus.rectangle.on.rectangle" title="WindowGroup test">
          <BodyText secondary>
            iPhone Duo supports multiple app instances on the inner display. The
            system can make this action unavailable on the outer display.
          </BodyText>
          <PrimaryButton
            disabled
            label="Open diagnostics window"
            onPress={openDiagnostics}
            symbol="macwindow.badge.plus"
          />
          <Caption>Requests this session: 0</Caption>
          <Caption>
            The package does not yet create independent scene sessions. You can
            preview the diagnostics screen below.
          </Caption>
          <PrimaryButton
            label="Preview diagnostics"
            onPress={openDiagnostics}
            secondary
            symbol="waveform.path.ecg.rectangle"
          />
        </LabCard>

        <LabCard
          symbol="arrow.up.left.and.arrow.down.right"
          title="Resize test"
        >
          <BodyText secondary>
            Place this scene beside the diagnostics scene, then resize or stack
            it with video. Both views use size classes and local geometry
            instead of UIScreen.main assumptions.
          </BodyText>
        </LabCard>

        <LabCard symbol="display.2" title="External display accessory">
          <StatusLine active={accessory.available}>
            {accessory.available
              ? 'External accessory available'
              : 'No eligible external display'}
          </StatusLine>
          <ToggleRow
            disabled={!accessory.available}
            label="Show presentation companion"
            onChange={setAccessoryEnabled}
            value={accessoryEnabled}
          />
          <Caption>
            ExternalNonInteractiveAccessory pairs supplemental, noninteractive
            content with this scene. CameraCaptureAccessory, demonstrated in
            Camera, is the Duo-specific route to the outer display during
            capture.
          </Caption>
        </LabCard>
      </DemoPage>

      <DuoSceneAccessory
        content={{
          title: 'Duo Lab Companion',
          subtitle:
            'This noninteractive scene accessory follows the primary scene on a connected display.',
          systemImage: 'display.2',
          backgroundColor: '#5856D6',
          gradientEndColor: '#AF52DE',
          foregroundColor: '#FFFFFF',
          symbolSize: 64,
          titleFontSize: 34,
          subtitleFontSize: 20,
          subtitleOpacity: 0.8,
          spacing: 18,
        }}
        enabled={accessoryEnabled}
        kind="externalDisplay"
        onStateChange={setAccessory}
      />

      <DiagnosticsModal
        onClose={() => setDiagnosticsVisible(false)}
        visible={diagnosticsVisible}
      />
    </>
  );
}

function DiagnosticsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const palette = useDuoPalette();
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView
        style={[styles.modal, { backgroundColor: palette.grouped }]}
      >
        <View style={styles.diagnosticsNavigation}>
          <Text
            style={[styles.diagnosticsNavigationTitle, { color: palette.text }]}
          >
            Duo Diagnostics
          </Text>
        </View>
        <DuoProvider includeInactiveRegions style={styles.modal}>
          <DiagnosticsContent onClose={onClose} />
        </DuoProvider>
      </SafeAreaView>
    </Modal>
  );
}

function DiagnosticsContent({ onClose }: { onClose: () => void }) {
  const palette = useDuoPalette();
  const duo = useDuo();
  return (
    <DuoGeometryView includeInactiveRegions style={styles.modal}>
      {(geometry) => (
        <View style={styles.diagnostics}>
          <Symbol
            color={palette.indigo}
            name="waveform.path.ecg.rectangle"
            size={64}
          />
          <Text style={[styles.diagnosticsTitle, { color: palette.text }]}>
            Diagnostics Scene
          </Text>
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
            <MetricPill label="Width" value={`${Math.trunc(geometry.width)}`} />
            <MetricPill
              label="Height"
              value={`${Math.trunc(geometry.height)}`}
            />
          </View>
          <Text style={[styles.divisions, { color: palette.text }]}>
            Division regions:{' '}
            {
              geometry.reservedRegions.filter(
                (region) => region.kind === 'division'
              ).length
            }
          </Text>
          <PrimaryButton
            label="Close this window"
            onPress={onClose}
            secondary
          />
          <Caption>
            Modal preview • this screen does not create an independent window.
          </Caption>
        </View>
      )}
    </DuoGeometryView>
  );
}

function sizeClassLabel(sizeClass: string) {
  return sizeClass === 'unspecified'
    ? '—'
    : sizeClass.charAt(0).toUpperCase() + sizeClass.slice(1);
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  diagnosticsNavigation: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticsNavigationTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  diagnostics: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  diagnosticsTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    textAlign: 'center',
  },
  metrics: { alignSelf: 'center', flexDirection: 'row', gap: 8 },
  divisions: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
