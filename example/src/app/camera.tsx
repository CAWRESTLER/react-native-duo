import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DuoCameraView,
  DuoSceneAccessory,
  type DuoCameraDirection,
  type DuoCameraLocation,
  type DuoCameraViewState,
  type DuoSmartFramingMode,
} from '@cawrestler/react-native-duo';

import {
  ActionButton,
  Card,
  Choice,
  CodeSample,
  ComponentIntro,
  DemoScreen,
  Hero,
  Metric,
  Pill,
  PropReference,
  Toggle,
  colors,
} from '../components/demo-ui';

const cameraProps = [
  {
    name: 'location',
    type: "'inner' | 'outer'",
    description:
      'Selects a physical Duo camera when direction is not supplied.',
    defaultValue: 'outer',
  },
  {
    name: 'direction',
    type: "'forward' | 'backward'",
    description:
      'Tracks whichever Duo camera faces that way; overrides location.',
  },
  {
    name: 'active',
    type: 'boolean',
    description: 'Starts or stops the capture session.',
    defaultValue: 'true',
  },
  {
    name: 'requestPermission',
    type: 'boolean',
    description:
      'Requests permission when changed to true after a user action.',
    defaultValue: 'false',
  },
  {
    name: 'mirrored',
    type: 'boolean',
    description: 'Mirrors the native preview layer.',
    defaultValue: 'false',
  },
  {
    name: 'resizeMode',
    type: "'cover' | 'contain'",
    description: 'Controls how the native video preview fills its bounds.',
    defaultValue: 'cover',
  },
  {
    name: 'smartFraming',
    type: "'off' | 'monitor' | 'apply'",
    description: 'Disables, reports, or applies framing recommendations.',
    defaultValue: 'off',
  },
  {
    name: 'onStateChange',
    type: '(state: DuoCameraViewState) => void',
    description:
      'Reports permission, device, direction, session, and framing state.',
  },
  {
    name: 'style',
    type: 'StyleProp<ViewStyle>',
    description: 'Sizes and positions the native preview.',
  },
] as const;

const initialState: DuoCameraViewState = {
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
  smartFraming: {
    supported: false,
    monitoring: false,
    mode: 'off',
    recommended: null,
  },
  error: null,
};

export default function CameraScreen() {
  const [location, setLocation] = useState<DuoCameraLocation>('outer');
  const [selection, setSelection] = useState<'physical' | 'facing'>('facing');
  const [direction, setDirection] = useState<DuoCameraDirection>('forward');
  const [smartFraming, setSmartFraming] =
    useState<DuoSmartFramingMode>('monitor');
  const [active, setActive] = useState(true);
  const [mirrored, setMirrored] = useState(false);
  const [resizeMode, setResizeMode] = useState<'cover' | 'contain'>('cover');
  const [requestPermission, setRequestPermission] = useState(false);
  const [camera, setCamera] = useState(initialState);

  return (
    <DemoScreen>
      <Hero
        body="Use the Duo-specific inner and outer camera device types without writing an AVFoundation bridge. Permission is only requested after you tap the button."
        eyebrow="CAMERA LAB"
        title="Pick the camera by location"
      />

      <ComponentIntro
        fallback="Unsupported state callback; no preview"
        name="DuoCameraView"
        native="AVFoundation Duo devices + direction coordinator"
        summary="Owns a native camera preview and exposes Duo-specific physical cameras, direction-aware switching, permission state, and smart-framing recommendations."
        useFor="Preview and camera selection"
      />

      <Card title="Controls">
        <Choice
          label="Selection mode"
          onChange={setSelection}
          options={['facing', 'physical']}
          value={selection}
        />
        {selection === 'facing' ? (
          <Choice
            label="Faces"
            onChange={setDirection}
            options={['forward', 'backward']}
            value={direction}
          />
        ) : (
          <Choice
            label="Physical camera"
            onChange={setLocation}
            options={['inner', 'outer']}
            value={location}
          />
        )}
        <Choice
          label="Smart framing"
          onChange={setSmartFraming}
          options={['off', 'monitor', 'apply']}
          value={smartFraming}
        />
        <Choice
          label="Preview resize"
          onChange={setResizeMode}
          options={['cover', 'contain']}
          value={resizeMode}
        />
        <Toggle label="Session active" onChange={setActive} value={active} />
        <Toggle
          label="Mirror preview"
          onChange={setMirrored}
          value={mirrored}
        />
        {camera.permission === 'undetermined' && !requestPermission ? (
          <ActionButton
            label="Allow camera access"
            onPress={() => setRequestPermission(true)}
          />
        ) : null}
      </Card>

      <View style={styles.preview}>
        <DuoCameraView
          active={active}
          direction={selection === 'facing' ? direction : undefined}
          location={location}
          mirrored={mirrored}
          onStateChange={setCamera}
          requestPermission={requestPermission}
          resizeMode={resizeMode}
          smartFraming={smartFraming}
          style={StyleSheet.absoluteFill}
        />
        {!camera.running ? (
          <View pointerEvents="none" style={styles.previewMessage}>
            <Text style={styles.previewTitle}>
              {camera.permission === 'denied'
                ? 'Camera permission denied'
                : 'Preview waiting'}
            </Text>
            <Text style={styles.previewBody}>
              {camera.error ??
                'Run on a Duo simulator or device with the selected camera available.'}
            </Text>
          </View>
        ) : null}
        <View pointerEvents="none" style={styles.previewBadge}>
          <Pill
            label={
              selection === 'facing'
                ? `${direction} facing`
                : `${location} camera`
            }
            tone={camera.running ? 'good' : 'warning'}
          />
        </View>
      </View>

      <DuoSceneAccessory
        content={{
          title: `${location === 'inner' ? 'Inner' : 'Outer'} camera active`,
          subtitle: 'Controlled by the React Native Duo demo',
          systemImage: 'camera.fill',
          backgroundColor: '#07111F',
          foregroundColor: '#67E8F9',
        }}
        enabled={active && camera.running}
        kind="cameraCapture"
      />

      <Card title="Native result">
        <Pill
          label={
            camera.running
              ? 'capture session running'
              : camera.supported
                ? 'native session idle'
                : 'fallback'
          }
          tone={camera.running ? 'good' : 'neutral'}
        />
        <Metric label="Permission" value={camera.permission} />
        <Metric label="API supported" value={camera.supported ? 'Yes' : 'No'} />
        <Metric label="Session running" value={camera.running ? 'Yes' : 'No'} />
        <Metric
          label="Device available"
          value={camera.available ? 'Yes' : 'No'}
        />
        <Metric label="Device" value={camera.deviceName ?? '—'} />
        <Metric label="Device ID" value={camera.deviceId ?? '—'} />
        <Metric label="Physical location" value={camera.location} />
        <Metric
          label="Direction tracking"
          value={camera.direction ?? 'Physical location'}
        />
        <Metric
          label="Smart framing"
          value={
            camera.smartFraming.monitoring
              ? `${camera.smartFraming.mode} · running`
              : camera.smartFraming.mode
          }
        />
        <Metric
          label="Recommendation"
          value={
            camera.smartFraming.recommended
              ? `${camera.smartFraming.recommended.aspectRatio} · ${camera.smartFraming.recommended.zoomFactor.toFixed(2)}×`
              : '—'
          }
        />
        <Metric
          label="Forward camera IDs"
          value={camera.forwardCameraIds.join(', ') || '—'}
        />
        <Metric
          label="Backward camera IDs"
          value={camera.backwardCameraIds.join(', ') || '—'}
        />
        {camera.error ? <Metric label="Error" value={camera.error} /> : null}
      </Card>

      <Card title="Complete prop reference">
        <PropReference rows={cameraProps} />
      </Card>

      <Card title="Copy this pattern">
        <CodeSample>{`<DuoCameraView
  location="${location}"
  direction={${selection === 'facing' ? `'${direction}'` : 'undefined'}}
  active={${active}}
  mirrored={${mirrored}}
  resizeMode="${resizeMode}"
  smartFraming="${smartFraming}"
  requestPermission={permissionButtonPressed}
  onStateChange={setCameraState}
/>`}</CodeSample>
      </Card>
    </DemoScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 380,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
  },
  previewMessage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  previewTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  previewBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  previewBadge: { position: 'absolute', top: 14, left: 14 },
});
