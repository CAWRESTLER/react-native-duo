import {
  DuoAdaptiveToolbar,
  DuoCameraView,
  DuoSceneAccessory,
  useDuoCameras,
  type DuoCameraSource,
  type DuoCameraViewState,
  type DuoSceneAccessoryState,
  type DuoToolbarItem,
} from '@cawrestler/react-native-duo';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLabNavigation } from '@/components/duo-shell';
import {
  BodyText,
  Caption,
  DemoPage,
  Divider,
  LabCard,
  MetricPill,
  SegmentedControl,
  StatusLine,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';

type CameraChoice = 'automatic' | 'outer' | 'inner' | 'rear';
const cameraLabels: Record<CameraChoice, string> = {
  automatic: 'Virtual Front',
  outer: 'Outer Front',
  inner: 'Inner Front',
  rear: 'Rear',
};

const cameraSources: Record<CameraChoice, DuoCameraSource> = {
  automatic: 'virtualFront',
  outer: 'outerFront',
  inner: 'innerFront',
  rear: 'rear',
};

const initialCamera: DuoCameraViewState = {
  supported: false,
  available: false,
  running: false,
  permission: 'undetermined',
  location: 'outer',
  direction: null,
  forwardCameraIds: [],
  backwardCameraIds: [],
  deviceId: null,
  deviceName: null,
  source: null,
  previewRotation: null,
  sensorCompensationSupported: false,
  sensorCompensationDisabled: false,
  aspectRatios: [],
  selectedAspectRatio: null,
  smartFraming: {
    supported: false,
    monitoring: false,
    mode: 'off',
    recommended: null,
  },
  error: null,
};

const initialAccessory: DuoSceneAccessoryState = {
  supported: false,
  registered: false,
  available: false,
  enabled: true,
  kind: 'cameraCapture',
};

export function CameraLab() {
  const palette = useDuoPalette();
  const navigation = useLabNavigation();
  const discovered = useDuoCameras();
  const [choice, setChoice] = useState<CameraChoice>('automatic');
  const [fillPreview, setFillPreview] = useState(true);
  const [camera, setCamera] = useState(initialCamera);
  const [requestedAspectRatio, setRequestedAspectRatio] = useState<string>();
  const [accessoryEnabled, setAccessoryEnabled] = useState(true);
  const [accessory, setAccessory] = useState(initialAccessory);
  const nameFor = (id: string) =>
    discovered.find((device) => device.id === id)?.name ?? id;
  const status = camera.running
    ? `Streaming ${camera.deviceName ?? cameraLabels[choice]}`
    : camera.permission === 'denied' || camera.permission === 'restricted'
      ? 'Camera permission is required'
      : camera.permission === 'granted' && !camera.available
        ? `${cameraLabels[choice]} is unavailable on this runtime`
        : (camera.error ?? 'Camera is idle');
  const toolbarItems: DuoToolbarItem[] = [
    ...(navigation.compact
      ? [
          {
            id: 'navigation',
            title: 'Duo Lab',
            systemImage: 'chevron.backward',
            placement: 'cancellationAction' as const,
          },
        ]
      : []),
    {
      id: 'teleprompter',
      title: accessoryEnabled ? 'Hide teleprompter' : 'Show teleprompter',
      systemImage: accessoryEnabled ? 'text.rectangle.fill' : 'text.rectangle',
      placement: 'pinnedTrailing',
      disabled: !accessory.available,
    },
  ];

  return (
    <DuoAdaptiveToolbar
      items={toolbarItems}
      onItemPress={(id) => {
        if (id === 'navigation') navigation.showNavigation();
        else if (id === 'teleprompter')
          setAccessoryEnabled((enabled) => !enabled);
      }}
      showsNavigationBar
      tintColor={palette.indigo}
      title="Duo Camera"
    >
      <DemoPage
        subtitle="Test camera selection, direction, framing, and the outer display"
        symbol="camera.aperture"
        title="Duo Camera"
      >
        <View style={[styles.preview, { backgroundColor: '#000000' }]}>
          <DuoCameraView
            active
            source={cameraSources[choice]}
            dynamicAspectRatio={requestedAspectRatio}
            mirrored={choice !== 'rear'}
            onStateChange={setCamera}
            requestPermission
            resizeMode={fillPreview ? 'cover' : 'contain'}
            sensorOrientationCompensation={false}
            smartFraming="off"
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.statusBadge}>
            <View style={styles.statusBadgeContent}>
              <Symbol
                color="#FFFFFF"
                name={
                  camera.running ? 'record.circle' : 'exclamationmark.circle'
                }
                size={12}
                weight="semibold"
              />
              <Text style={styles.statusBadgeText}>{status}</Text>
            </View>
          </View>
        </View>

        <LabCard symbol="camera.rotate" title="Camera source">
          <SegmentedControl
            onChange={(nextChoice) => {
              setChoice(nextChoice);
              setRequestedAspectRatio(undefined);
            }}
            options={[
              { label: 'Virtual Front', value: 'automatic' },
              { label: 'Outer Front', value: 'outer' },
              { label: 'Inner Front', value: 'inner' },
              { label: 'Rear', value: 'rear' },
            ]}
            value={choice}
          />
          <ToggleRow
            label="Fill preview"
            onChange={setFillPreview}
            value={fillPreview}
          />
          {camera.aspectRatios?.length ? (
            <SegmentedControl
              label="Dynamic aspect ratio"
              onChange={setRequestedAspectRatio}
              options={camera.aspectRatios.map((ratio) => ({
                label: ratio,
                value: ratio,
              }))}
              value={requestedAspectRatio ?? camera.selectedAspectRatio ?? ''}
            />
          ) : null}
          <View style={styles.metrics}>
            <MetricPill
              label="Rotation"
              value={
                camera.previewRotation != null
                  ? `${camera.previewRotation.toFixed(1)}°`
                  : camera.running
                    ? 'Not exposed'
                    : '0.0°'
              }
            />
            <MetricPill
              color={palette.orange}
              label="Sensor compensation"
              value={
                camera.sensorCompensationDisabled ? 'Disabled' : 'Not supported'
              }
            />
          </View>
        </LabCard>

        <LabCard symbol="arrow.triangle.swap" title="Direction coordinator">
          <DirectionList
            color={palette.green}
            names={camera.forwardCameraIds.map(nameFor)}
            title="Facing this display"
          />
          <Divider />
          <DirectionList
            color={palette.orange}
            names={camera.backwardCameraIds.map(nameFor)}
            title="Facing away"
          />
          <Caption>
            The coordinator reports directions relative to this preview&apos;s
            UIView, so a second display gets its own independent map.
          </Caption>
        </LabCard>

        <LabCard symbol="camera.on.rectangle" title="Discovered devices">
          {discovered.length === 0 ? (
            <BodyText secondary>
              No capture devices are exposed by this simulator.
            </BodyText>
          ) : (
            discovered.map((device) => (
              <Text
                key={device.id}
                style={[styles.discoveredDevice, { color: palette.text }]}
              >
                {device.name} • {device.isVirtual ? 'virtual' : 'physical'} •{' '}
                {device.deviceType}
              </Text>
            ))
          )}
        </LabCard>

        <LabCard
          symbol="rectangle.on.rectangle"
          title="Camera capture accessory"
        >
          <StatusLine active={accessory.available}>
            {accessory.available
              ? 'Outer-display accessory available'
              : 'Accessory unavailable in the current pose'}
          </StatusLine>
          <ToggleRow
            disabled={!accessory.available}
            label="Show teleprompter on outer display"
            onChange={setAccessoryEnabled}
            value={accessoryEnabled}
          />
        </LabCard>
      </DemoPage>

      <DuoSceneAccessory
        content={{
          title: 'Welcome to\niPhone Duo',
          subtitle:
            'The camera UI remains on the inner display while this accessory appears outside.',
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          hideSymbol: true,
          eyebrow: 'LOOK HERE',
          eyebrowColor: '#FFCC00',
          titleFontSize: 44,
          titleRounded: true,
          subtitleFontSize: 17,
          subtitleSemibold: true,
          subtitleOpacity: 0.7,
          spacing: 22,
        }}
        enabled={accessoryEnabled}
        kind="cameraCapture"
        onStateChange={setAccessory}
      />
    </DuoAdaptiveToolbar>
  );
}

function DirectionList({
  title,
  names,
  color,
}: {
  title: string;
  names: string[];
  color: string;
}) {
  const palette = useDuoPalette();
  return (
    <View style={styles.directionList}>
      <Text style={[styles.directionTitle, { color: palette.text }]}>
        {title}
      </Text>
      {names.length === 0 ? (
        <Caption>None reported</Caption>
      ) : (
        names.map((name) => (
          <View key={name} style={styles.directionDevice}>
            <Symbol color={color} name="camera.fill" size={12} />
            <Text style={[styles.deviceName, { color }]}>{name}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { minHeight: 300, overflow: 'hidden' },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'flex-start',
  },
  statusBadgeContent: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#333333CC',
    borderRadius: 999,
    padding: 8,
  },
  statusBadgeText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  directionList: { gap: 6 },
  directionTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  directionDevice: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deviceName: { fontSize: 12, lineHeight: 17 },
  discoveredDevice: { fontSize: 12, lineHeight: 16, fontFamily: 'Menlo' },
});
