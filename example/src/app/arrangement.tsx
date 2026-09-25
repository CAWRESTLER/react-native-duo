import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DuoArrangementView,
  type DuoArrangement,
  type DuoArrangementAxes,
  type DuoArrangementState,
  type DuoOverlayEdge,
} from '@cawrestler/react-native-duo';

import {
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

const arrangementProps = [
  {
    name: 'primary / secondary',
    type: 'ReactNode',
    description:
      'The two independent React surfaces managed by the arrangement.',
  },
  {
    name: 'arrangement',
    type: "'split' | 'overlay'",
    description: 'Places panes side by side or layers the secondary pane.',
    defaultValue: 'split',
  },
  {
    name: 'axes',
    type: "'automatic' | 'horizontal' | 'vertical' | 'both'",
    description: 'Axes UIKit may use while adapting the arrangement.',
    defaultValue: 'automatic',
  },
  {
    name: 'primaryFraction',
    type: 'number (0.05–0.95)',
    description: 'Preferred width or height of the primary pane.',
    defaultValue: '0.5',
  },
  {
    name: 'overlayEdge',
    type: "'top' | 'leading' | 'bottom' | 'trailing'",
    description: 'Edge used for the secondary pane in overlay mode.',
    defaultValue: 'trailing',
  },
  {
    name: 'animated',
    type: 'boolean',
    description: 'Animates transitions between native arrangements.',
    defaultValue: 'true',
  },
  {
    name: 'onStateChange',
    type: '(state: DuoArrangementState) => void',
    description:
      'Reports native mode and both panes’ split, z-index, and visibility.',
  },
  {
    name: 'style / primaryStyle / secondaryStyle',
    type: 'StyleProp<ViewStyle>',
    description: 'Styles the host and each pane wrapper.',
  },
] as const;

const emptyState: DuoArrangementState = {
  native: false,
  arrangement: 'split',
  primary: { zIndex: 0, splitAxis: 'none', isHidden: false },
  secondary: { zIndex: 0, splitAxis: 'none', isHidden: false },
};

export default function ArrangementScreen() {
  const [arrangement, setArrangement] = useState<DuoArrangement>('split');
  const [axes, setAxes] = useState<DuoArrangementAxes>('automatic');
  const [edge, setEdge] = useState<DuoOverlayEdge>('trailing');
  const [fraction, setFraction] = useState<'0.35' | '0.5' | '0.65'>('0.5');
  const [animated, setAnimated] = useState(true);
  const [nativeState, setNativeState] = useState(emptyState);

  return (
    <DemoScreen>
      <Hero
        body="Tune the controls, then fold or rotate the simulator. The panes below are owned by UIArrangementViewController on iOS 27.1."
        eyebrow="ARRANGEMENT LAB"
        title="One component, two screens"
      />

      <ComponentIntro
        fallback="Flexbox split or overlay"
        name="DuoArrangementView"
        native="UIArrangementViewController"
        summary="Accepts two normal React nodes and lets UIKit determine the best split or overlay geometry as the Duo folds, rotates, and resizes."
        useFor="Master/detail, editor/preview, map/details"
      />

      <Card title="Controls">
        <Choice
          label="Arrangement"
          onChange={setArrangement}
          options={['split', 'overlay']}
          value={arrangement}
        />
        <Choice
          label="Axes"
          onChange={setAxes}
          options={['automatic', 'horizontal', 'vertical', 'both']}
          value={axes}
        />
        <Choice
          label="Primary size"
          onChange={setFraction}
          options={['0.35', '0.5', '0.65']}
          value={fraction}
        />
        {arrangement === 'overlay' ? (
          <Choice
            label="Overlay edge"
            onChange={setEdge}
            options={['top', 'leading', 'bottom', 'trailing']}
            value={edge}
          />
        ) : null}
        <Toggle
          label="Animate arrangement changes"
          onChange={setAnimated}
          value={animated}
        />
      </Card>

      <View style={styles.lab}>
        <DuoArrangementView
          arrangement={arrangement}
          animated={animated}
          axes={axes}
          onStateChange={setNativeState}
          overlayEdge={edge}
          primary={
            <Pane
              detail="Your main React Native surface"
              label="PRIMARY"
              tone="cyan"
            />
          }
          primaryFraction={Number(fraction)}
          secondary={
            <Pane
              detail="A second independent surface"
              label="SECONDARY"
              tone="violet"
            />
          }
        />
      </View>

      <Card title="Native result">
        <Pill
          label={
            nativeState.native
              ? 'UIArrangementViewController'
              : 'flexbox fallback'
          }
          tone={nativeState.native ? 'good' : 'neutral'}
        />
        <Metric
          label="Primary split axis"
          value={nativeState.primary.splitAxis}
        />
        <Metric
          label="Secondary split axis"
          value={nativeState.secondary.splitAxis}
        />
        <Metric
          label="Secondary z-index"
          value={nativeState.secondary.zIndex}
        />
        <Metric
          label="Primary visible"
          value={nativeState.primary.isHidden ? 'No' : 'Yes'}
        />
        <Metric
          label="Secondary visible"
          value={nativeState.secondary.isHidden ? 'No' : 'Yes'}
        />
      </Card>

      <Card title="Complete prop reference">
        <PropReference rows={arrangementProps} />
      </Card>

      <Card title="Copy this pattern">
        <CodeSample>{`<DuoArrangementView
  arrangement="${arrangement}"
  axes="${axes}"
  animated={${animated}}
  primaryFraction={${fraction}}
  overlayEdge="${edge}"
  primary={<MainScreen />}
  secondary={<CompanionScreen />}
/>`}</CodeSample>
      </Card>
    </DemoScreen>
  );
}

function Pane({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: 'cyan' | 'violet';
}) {
  return (
    <View style={[styles.pane, tone === 'cyan' ? styles.cyan : styles.violet]}>
      <Text style={styles.paneLabel}>{label}</Text>
      <Text style={styles.paneDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lab: {
    height: 360,
    overflow: 'hidden',
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
  },
  pane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 6,
  },
  cyan: { backgroundColor: '#155E75' },
  violet: { backgroundColor: '#5B21B6' },
  paneLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  paneDetail: { color: '#E2E8F0', fontSize: 14, textAlign: 'center' },
});
