import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DuoSceneAccessory,
  type DuoSceneAccessoryKind,
  type DuoSceneAccessoryState,
} from '@cawrestler/react-native-duo';

import {
  Card,
  Choice,
  CodeSample,
  ComponentIntro,
  DemoScreen,
  EmptyState,
  Hero,
  Metric,
  Pill,
  PropReference,
  Toggle,
  colors,
} from '../components/demo-ui';

const sceneProps = [
  {
    name: 'kind',
    type: "'externalDisplay' | 'cameraCapture'",
    description: 'Chooses the system accessory surface to register.',
  },
  {
    name: 'content',
    type: 'DuoSceneAccessoryContent',
    description:
      'Title, subtitle, SF Symbol, foreground color, and background color.',
  },
  {
    name: 'enabled',
    type: 'boolean',
    description: 'Registers or unregisters the native scene accessory.',
    defaultValue: 'true',
  },
  {
    name: 'onStateChange',
    type: '(state: DuoSceneAccessoryState) => void',
    description:
      'Reports support, registration, availability, enabled state, and kind.',
  },
] as const;

const initialState: DuoSceneAccessoryState = {
  supported: false,
  registered: false,
  available: false,
  enabled: true,
  kind: 'externalDisplay',
};

export default function ScenesScreen() {
  const [kind, setKind] = useState<DuoSceneAccessoryKind>('externalDisplay');
  const [enabled, setEnabled] = useState(true);
  const [scene, setScene] = useState(initialState);
  const content = {
    title:
      kind === 'externalDisplay' ? 'Presentation is ready' : 'Camera controls',
    subtitle:
      kind === 'externalDisplay'
        ? 'Connected from React Native'
        : 'Capture is running on iPhone',
    systemImage: kind === 'externalDisplay' ? 'display.2' : 'camera.aperture',
    backgroundColor: '#07111F',
    foregroundColor: '#67E8F9',
  };

  return (
    <DemoScreen>
      <Hero
        body="Register a declarative companion scene for an external display or the camera-capture surface. The package owns the required native scene lifecycle."
        eyebrow="SCENE ACCESSORY LAB"
        title="A second surface, from JSX"
      />

      <ComponentIntro
        fallback="No visible output; unsupported state callback"
        name="DuoSceneAccessory"
        native="UISceneAccessory"
        summary="Registers lightweight declarative content for a companion system scene whose lifecycle is separate from the main React Native window."
        useFor="External-display status or camera controls"
      />

      <Card title="Controls">
        <Choice
          label="Accessory kind"
          onChange={setKind}
          options={['externalDisplay', 'cameraCapture']}
          value={kind}
        />
        <Toggle
          label="Accessory enabled"
          onChange={setEnabled}
          value={enabled}
        />
      </Card>

      <Card title="Companion preview">
        <View style={styles.companion}>
          <Text style={styles.symbol}>
            {kind === 'externalDisplay' ? '▣' : '◉'}
          </Text>
          <Text style={styles.companionTitle}>{content.title}</Text>
          <Text style={styles.companionBody}>{content.subtitle}</Text>
        </View>
        <EmptyState>
          This preview mirrors the declarative content rendered by the native
          accessory scene.
        </EmptyState>
      </Card>

      <DuoSceneAccessory
        content={content}
        enabled={enabled}
        kind={kind}
        onStateChange={setScene}
      />

      <Card title="Native result">
        <Pill
          label={scene.supported ? 'UISceneAccessory supported' : 'fallback'}
          tone={scene.supported ? 'good' : 'neutral'}
        />
        <Metric label="Registered" value={scene.registered ? 'Yes' : 'No'} />
        <Metric
          label="Accessory available"
          value={scene.available ? 'Yes' : 'No'}
        />
        <Metric label="Enabled" value={scene.enabled ? 'Yes' : 'No'} />
        <Metric label="Kind" value={scene.kind} />
      </Card>

      <Card title="Complete prop reference">
        <PropReference rows={sceneProps} />
      </Card>

      <Card title="Copy this pattern">
        <CodeSample>{`<DuoSceneAccessory
  kind="${kind}"
  enabled={${enabled}}
  content={{
    title: '${content.title}',
    subtitle: '${content.subtitle}',
    systemImage: '${content.systemImage}',
  }}
/>`}</CodeSample>
      </Card>
    </DemoScreen>
  );
}

const styles = StyleSheet.create({
  companion: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07111F',
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  symbol: { color: colors.accent, fontSize: 44, fontWeight: '300' },
  companionTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  companionBody: { color: colors.muted, fontSize: 15, textAlign: 'center' },
});
