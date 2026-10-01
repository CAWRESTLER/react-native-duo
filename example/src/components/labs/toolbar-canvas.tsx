import {
  DuoGeometryView,
  type DuoGeometryState,
  type DuoToolbarContentLayout,
  type DuoToolbarState,
} from '@cawrestler/react-native-duo';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  BodyText,
  Caption,
  LabCard,
  PrimaryButton,
  SegmentedControl,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';
import { resolveCanvasControlInsets } from './canvas-layout';

export type CanvasScene = 'day' | 'dusk' | 'night';

const scenes = {
  day: {
    label: 'Day',
    sky: ['#253E67', '#557BA0', '#D6CEB8'],
    sun: '#FFE5B2',
    hills: ['#70869B', '#435E7A', '#233B53'],
  },
  dusk: {
    label: 'Dusk',
    sky: ['#2E2957', '#855771', '#E4A48D'],
    sun: '#FFDBBC',
    hills: ['#916582', '#614B76', '#333454'],
  },
  night: {
    label: 'Night',
    sky: ['#101B33', '#273154', '#6B6484'],
    sun: '#E3DCF0',
    hills: ['#4C5279', '#343C61', '#1B2946'],
  },
} as const;

const gridPositions = [20, 40, 60, 80] as const;

/** Artwork is decoration: it spans the host, but never receives touches. */
export function ToolbarCanvasBackground({
  scene,
  diagnostics,
}: {
  scene: CanvasScene;
  diagnostics: boolean;
}) {
  const colors = scenes[scene];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.background,
        {
          backgroundColor: colors.sky[0],
          backgroundImage: `linear-gradient(to bottom, ${colors.sky[0]}, ${colors.sky[1]} 60%, ${colors.sky[2]})`,
        },
      ]}
    >
      <View style={[styles.halo, { backgroundColor: colors.sun }]} />
      <View style={[styles.sun, { backgroundColor: colors.sun }]} />
      <View
        style={[styles.distantHill, { backgroundColor: colors.hills[0] }]}
      />
      <View style={[styles.middleHill, { backgroundColor: colors.hills[1] }]} />
      <View
        style={[styles.foregroundHill, { backgroundColor: colors.hills[2] }]}
      />
      {diagnostics ? (
        <View style={[StyleSheet.absoluteFill, styles.hostOutline]}>
          {gridPositions.map((position) => (
            <View
              key={`column-${position}`}
              style={[styles.column, { left: `${position}%` }]}
            />
          ))}
          {gridPositions.map((position) => (
            <View
              key={`row-${position}`}
              style={[styles.row, { top: `${position}%` }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

type CanvasProps = {
  barsHidden: boolean;
  contentLayout: DuoToolbarContentLayout;
  diagnostics: boolean;
  scene: CanvasScene;
  onBarsHiddenChange: (hidden: boolean) => void;
  onContentLayoutChange: (layout: DuoToolbarContentLayout) => void;
  onDiagnosticsChange: (enabled: boolean) => void;
  onSceneChange: (scene: CanvasScene) => void;
  onExit: () => void;
  toolbarState: DuoToolbarState;
};

export function ToolbarCanvas(props: CanvasProps) {
  return (
    <DuoGeometryView style={styles.canvas}>
      {(geometry) => <CanvasContent {...props} geometry={geometry} />}
    </DuoGeometryView>
  );
}

function CanvasContent({
  barsHidden,
  contentLayout,
  diagnostics,
  geometry,
  scene,
  onBarsHiddenChange,
  onContentLayoutChange,
  onDiagnosticsChange,
  onSceneChange,
  onExit,
  toolbarState,
}: CanvasProps & { geometry: DuoGeometryState }) {
  const hardwareInsets = useSafeAreaInsets();
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const controlInsets = resolveCanvasControlInsets({
    size: canvasSize,
    toolbarState,
    contentLayout,
    barsHidden,
    geometry,
    hardwareInsets,
  });
  const controlHeight =
    canvasSize.height - controlInsets.top - controlInsets.bottom;
  const compactControls =
    canvasSize.width - controlInsets.left - controlInsets.right < 300;

  return (
    <View
      collapsable={false}
      onLayout={({ nativeEvent }) => {
        const { width, height } = nativeEvent.layout;
        setCanvasSize((previous) =>
          previous.width === width && previous.height === height
            ? previous
            : { width, height }
        );
      }}
      style={styles.canvas}
    >
      {diagnostics ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.contentOutline]}
        />
      ) : null}
      <View
        pointerEvents="box-none"
        style={[
          styles.controls,
          {
            top: controlInsets.top + 12,
            right: controlInsets.right + 16,
            bottom: controlInsets.bottom + 12,
            left: controlInsets.left + 16,
          },
        ]}
      >
        <View pointerEvents="box-none" style={styles.topControls}>
          <Pressable
            accessibilityLabel="Back to Workbench"
            accessibilityRole="button"
            onPress={onExit}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          >
            <Symbol color="#FFFFFF" name="chevron.backward" size={16} />
            {compactControls ? null : (
              <Text style={styles.buttonLabel}>Workbench</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityLabel="Canvas options"
            accessibilityRole="button"
            accessibilityState={{ expanded: optionsOpen }}
            aria-expanded={optionsOpen}
            onPress={() => setOptionsOpen(true)}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          >
            <Symbol color="#FFFFFF" name="slider.horizontal.3" size={18} />
            {compactControls ? null : (
              <Text style={styles.buttonLabel}>Options</Text>
            )}
          </Pressable>
        </View>
        <View pointerEvents="none" style={styles.intro}>
          {controlHeight >= 310 ? (
            <>
              <Text style={styles.eyebrow}>DUO STUDIO</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Room to explore.
              </Text>
              <Text style={styles.subtitle}>
                Artwork fills the canvas.{'\n'}Controls stay clear of system UI.
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.sceneControls}>
          {(Object.keys(scenes) as CanvasScene[]).map((value) => (
            <Pressable
              accessibilityLabel={`${scenes[value].label} scene`}
              accessibilityRole="button"
              accessibilityState={{ selected: scene === value }}
              key={value}
              onPress={() => onSceneChange(value)}
              style={({ pressed }) => [
                styles.sceneButton,
                scene === value && styles.selectedScene,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.buttonLabel,
                  scene === value && styles.selectedSceneLabel,
                ]}
              >
                {scenes[value].label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <CanvasOptions
        barsHidden={barsHidden}
        canvasSize={canvasSize}
        contentLayout={contentLayout}
        diagnostics={diagnostics}
        onBarsHiddenChange={onBarsHiddenChange}
        onClose={() => setOptionsOpen(false)}
        onContentLayoutChange={onContentLayoutChange}
        onDiagnosticsChange={onDiagnosticsChange}
        toolbarState={toolbarState}
        visible={optionsOpen}
      />
    </View>
  );
}

function CanvasOptions({
  barsHidden,
  canvasSize,
  contentLayout,
  diagnostics,
  onBarsHiddenChange,
  onClose,
  onContentLayoutChange,
  onDiagnosticsChange,
  toolbarState,
  visible,
}: Pick<
  CanvasProps,
  | 'barsHidden'
  | 'contentLayout'
  | 'diagnostics'
  | 'onBarsHiddenChange'
  | 'onContentLayoutChange'
  | 'onDiagnosticsChange'
  | 'toolbarState'
> & {
  canvasSize: { width: number; height: number };
  onClose: () => void;
  visible: boolean;
}) {
  const palette = useDuoPalette();
  const host = toolbarState.contentSize;
  const insets = toolbarState.contentInsets;
  return (
    <Modal
      allowSwipeDismissal
      // Web's safe-area observer measures once per size change. A slide's
      // offscreen mount can leave stale viewport insets after it moves onscreen.
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.options, { backgroundColor: palette.grouped }]}
        >
          <View style={styles.optionsHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.optionsTitle, { color: palette.text }]}
            >
              Canvas options
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.doneLabel, { color: palette.indigo }]}>
                Done
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.optionsContent}
            contentInsetAdjustmentBehavior="never"
            style={styles.optionsScroll}
          >
            <BodyText secondary>
              This is an intentionally immersive, non-scrolling surface. Normal
              lab screens keep their readable content inside the safe area.
            </BodyText>
            <LabCard symbol="rectangle.expand.vertical" title="Content layout">
              <SegmentedControl
                onChange={onContentLayoutChange}
                options={[
                  { label: 'Safe area', value: 'safeArea' },
                  { label: 'Edge to edge', value: 'edgeToEdge' },
                ]}
                value={contentLayout}
              />
              <Caption>
                The artwork always fills the host. Edge to edge expands React
                content too; it does not remove bars or system-reserved areas.
              </Caption>
              <PrimaryButton
                label={barsHidden ? 'Show all app bars' : 'Hide all app bars'}
                onPress={() => onBarsHiddenChange(!barsHidden)}
                secondary
                symbol={barsHidden ? 'sidebar.right' : 'rectangle'}
              />
              <Caption>
                App bars are {barsHidden ? 'hidden' : 'visible'}. The system
                status area, camera and home indicator remain.
              </Caption>
            </LabCard>
            <LabCard symbol="viewfinder" title="Developer tools">
              <Pressable
                accessibilityLabel="Show layout diagnostics"
                accessibilityRole="switch"
                accessibilityState={{ checked: diagnostics }}
                aria-checked={diagnostics}
                onPress={() => onDiagnosticsChange(!diagnostics)}
                style={styles.diagnosticToggle}
              >
                <View
                  aria-hidden
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                >
                  <ToggleRow
                    label="Show layout diagnostics"
                    onChange={onDiagnosticsChange}
                    value={diagnostics}
                  />
                </View>
              </Pressable>
              <Caption>
                Adds a grid, purple host bounds and green React content bounds.
                Turn this off to see the finished interface.
              </Caption>
              {diagnostics ? (
                <View style={styles.metrics}>
                  <BodyText>
                    React content: {Math.round(canvasSize.width)} ×{' '}
                    {Math.round(canvasSize.height)} pt
                  </BodyText>
                  <BodyText>
                    {host
                      ? `Toolbar host: ${Math.round(host.width)} × ${Math.round(host.height)} pt`
                      : 'Waiting for host measurement…'}
                  </BodyText>
                  <Caption>
                    Safe insets: T {Math.round(insets.top)} · R{' '}
                    {Math.round(insets.right)} · B {Math.round(insets.bottom)} ·
                    L {Math.round(insets.left)}
                    {'\n'}
                    {toolbarState.native ? 'Native' : 'Fallback'} host
                  </Caption>
                </View>
              ) : null}
            </LabCard>
            <Caption>
              Full width means this toolbar host, not the sidebar or the whole
              device. Controls avoid active local reserved regions; unsupported
              hosts fall back to safe insets. Workbench restores normal bars.
            </Caption>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  halo: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    top: '19%',
    left: '50%',
    transform: [{ translateX: -88 }],
    opacity: 0.1,
  },
  sun: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    top: '19%',
    left: '50%',
    marginTop: 44,
    transform: [{ translateX: -44 }],
  },
  distantHill: {
    position: 'absolute',
    width: '160%',
    height: '72%',
    borderRadius: 1000,
    left: '-45%',
    bottom: '-42%',
    transform: [{ rotate: '18deg' }],
  },
  middleHill: {
    position: 'absolute',
    width: '165%',
    height: '66%',
    borderRadius: 1000,
    right: '-55%',
    bottom: '-38%',
    transform: [{ rotate: '-16deg' }],
  },
  foregroundHill: {
    position: 'absolute',
    width: '170%',
    height: '70%',
    borderRadius: 1000,
    left: '-35%',
    bottom: '-53%',
    transform: [{ rotate: '8deg' }],
  },
  hostOutline: { borderWidth: 3, borderColor: '#A594FF' },
  contentOutline: { borderWidth: 2, borderColor: '#45E58A' },
  column: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#FFFFFF44',
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF44',
  },
  canvas: { flex: 1, minHeight: 0 },
  controls: { position: 'absolute' },
  topControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 28,
    backgroundColor: '#111A32E8',
  },
  buttonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  intro: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  eyebrow: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  sceneControls: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 28,
    backgroundColor: '#111A32E8',
  },
  sceneButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  selectedScene: { backgroundColor: '#FFFFFF' },
  selectedSceneLabel: { color: '#19233F' },
  options: { flex: 1 },
  optionsHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionsTitle: { flex: 1, fontSize: 22, fontWeight: '700' },
  doneButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  doneLabel: { fontSize: 17, fontWeight: '600' },
  optionsScroll: { flex: 1 },
  optionsContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: 20,
    gap: 20,
  },
  metrics: { gap: 8 },
  diagnosticToggle: { minHeight: 44, justifyContent: 'center' },
});
