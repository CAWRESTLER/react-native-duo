import { useDuo, type DuoReservedRegion } from '@cawrestler/react-native-duo';
import type { SFSymbol } from 'expo-symbols';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Symbol, useDuoPalette } from '@/components/duo-ui';

export type LabId =
  | 'overview'
  | 'hinge'
  | 'regions'
  | 'arrangements'
  | 'bars'
  | 'scenes'
  | 'camera';

const LabNavigationContext = createContext({
  compact: false,
  showNavigation: () => {},
});

export function useLabNavigation() {
  return useContext(LabNavigationContext);
}

export const labs: readonly {
  id: LabId;
  label: string;
  subtitle: string;
  symbol: SFSymbol;
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    subtitle: 'Device and layout diagnostics',
    symbol: 'square.grid.2x2',
  },
  {
    id: 'hinge',
    label: 'Hinge',
    subtitle: 'Live status and angle updates',
    symbol: 'angle',
  },
  {
    id: 'regions',
    label: 'Regions',
    subtitle: 'Division and occlusion geometry',
    symbol: 'rectangle.split.2x1',
  },
  {
    id: 'arrangements',
    label: 'Arrangements',
    subtitle: 'Split and overlay layouts',
    symbol: 'rectangle.3.group',
  },
  {
    id: 'bars',
    label: 'Adaptive Bars',
    subtitle: 'Vertical toolbars and overflow',
    symbol: 'sidebar.right',
  },
  {
    id: 'scenes',
    label: 'Scenes',
    subtitle: 'Multiple windows on iPhone',
    symbol: 'macwindow.on.rectangle',
  },
  {
    id: 'camera',
    label: 'Camera',
    subtitle: 'Duo cameras and outer display',
    symbol: 'camera.aperture',
  },
];

export function DuoShell({
  selected,
  onSelect,
  children,
}: {
  selected: LabId;
  onSelect: (lab: LabId) => void;
  children: ReactNode;
}) {
  const palette = useDuoPalette();
  const duo = useDuo();
  const { width, height } = useWindowDimensions();
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const resolvedSidebar = resolveSidebarLayout({
    width,
    height,
    regions: duo.reservedRegions,
  });
  const sidebarLayout = sidebarHidden
    ? { visible: false, width: 0, detailInset: 0 }
    : resolvedSidebar;
  const [menuVisible, setMenuVisible] = useState(false);
  const current = labs.find((lab) => lab.id === selected) ?? labs[0];
  const nativeHeader = selected === 'bars' || selected === 'camera';

  useEffect(() => {
    if (!sidebarLayout.visible) return;
    const frame = requestAnimationFrame(() => setMenuVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [sidebarLayout.visible]);

  const choose = (lab: LabId) => {
    onSelect(lab);
    if (resolvedSidebar.visible) setSidebarHidden(false);
    setMenuVisible(false);
  };

  return (
    <SafeAreaView
      edges={nativeHeader ? ['top', 'bottom'] : ['top', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: palette.grouped }]}
    >
      <View style={[styles.root, sidebarLayout.visible && styles.rootWide]}>
        {sidebarLayout.visible ? (
          <Sidebar
            selected={selected}
            onSelect={choose}
            width={sidebarLayout.width}
            onHide={() => setSidebarHidden(true)}
          />
        ) : null}
        <View
          style={[styles.detail, { paddingLeft: sidebarLayout.detailInset }]}
        >
          {!nativeHeader ? (
            <View
              style={[
                styles.compactBar,
                {
                  backgroundColor: palette.grouped,
                  borderColor: palette.separator,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.compactTitle, { color: palette.text }]}
              >
                {current.label === 'Overview'
                  ? 'iPhone Duo API Lab'
                  : current.label}
              </Text>
              {!sidebarLayout.visible ? (
                <Pressable
                  accessibilityLabel="Show Duo Lab navigation"
                  accessibilityRole="button"
                  onPress={() => setMenuVisible(true)}
                  style={({ pressed }) => [
                    styles.menuButton,
                    { backgroundColor: palette.surface },
                    pressed && styles.pressed,
                  ]}
                >
                  <Symbol
                    color={palette.text}
                    name="chevron.backward"
                    size={16}
                    weight="semibold"
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <LabNavigationContext.Provider
            value={{
              compact: !sidebarLayout.visible,
              showNavigation: () => setMenuVisible(true),
            }}
          >
            <View style={styles.content}>{children}</View>
          </LabNavigationContext.Provider>
        </View>
      </View>

      {menuVisible ? (
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Dismiss Duo Lab navigation"
            accessibilityRole="button"
            onPress={() => setMenuVisible(false)}
            style={[StyleSheet.absoluteFill, styles.menuBackdrop]}
          />
          <View
            style={[
              styles.menuPanel,
              {
                backgroundColor: palette.grouped,
                borderColor: palette.separator,
              },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderColor: palette.separator }]}
            >
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                Duo Lab
              </Text>
              <Pressable
                accessibilityLabel="Close navigation"
                accessibilityRole="button"
                onPress={() => setMenuVisible(false)}
                style={({ pressed }) => [
                  styles.menuButton,
                  { backgroundColor: palette.surface },
                  pressed && styles.pressed,
                ]}
              >
                <Symbol
                  color={palette.text}
                  name="xmark"
                  size={15}
                  weight="semibold"
                />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {labs.map((lab) => (
                <Destination
                  key={lab.id}
                  lab={lab}
                  selected={selected === lab.id}
                  onPress={() => choose(lab.id)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Sidebar({
  selected,
  onSelect,
  width,
  onHide,
}: {
  selected: LabId;
  onSelect: (lab: LabId) => void;
  width: number;
  onHide: () => void;
}) {
  const palette = useDuoPalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sidebar,
        {
          width,
          backgroundColor: palette.surface,
          borderColor: palette.separator,
          marginBottom: -insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <Text style={[styles.sidebarTitle, { color: palette.text }]}>
          Duo Lab
        </Text>
        <Pressable
          accessibilityLabel="Hide Sidebar"
          accessibilityRole="button"
          onPress={onHide}
          style={[styles.sidebarIcon, { backgroundColor: palette.surface }]}
        >
          <Symbol color={palette.text} name="sidebar.left" size={23} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.destinations}
        showsVerticalScrollIndicator={false}
      >
        {labs.map((lab) => (
          <Destination
            key={lab.id}
            lab={lab}
            selected={selected === lab.id}
            onPress={() => onSelect(lab.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const DEFAULT_SIDEBAR_WIDTH = 280;
const MINIMUM_SIDEBAR_WIDTH = 240;
const MINIMUM_DETAIL_WIDTH = 300;
const WIDE_LAYOUT_BREAKPOINT = 700;

function resolveSidebarLayout({
  width,
  height,
  regions,
}: {
  width: number;
  height: number;
  regions: readonly DuoReservedRegion[];
}) {
  const divisions = regions.filter((region) => region.kind === 'division');
  const verticalDivision = divisions
    .filter((region) => isVerticalDivision(region, height))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive))[0];
  const activeHorizontalDivision = divisions.some(
    (region) => region.isActive && !isVerticalDivision(region, height)
  );

  // An active fold reserves one physical pane for navigation. When fully open,
  // NavigationSplitView returns to its preferred 280-point sidebar width.
  if (
    verticalDivision?.isActive &&
    width >= MINIMUM_SIDEBAR_WIDTH + MINIMUM_DETAIL_WIDTH
  ) {
    const hingeCenter =
      verticalDivision.frame.x + verticalDivision.frame.width / 2;
    return {
      visible: true,
      width: Math.round(
        clamp(hingeCenter, MINIMUM_SIDEBAR_WIDTH, width - MINIMUM_DETAIL_WIDTH)
      ),
      detailInset: Math.max(
        verticalDivision.margins.right,
        verticalDivision.frame.width / 2
      ),
    };
  }

  // A tabletop-style fold divides the display vertically, so a persistent
  // left column would cross the hinge. Collapse it to the navigation button.
  if (activeHorizontalDivision)
    return { visible: false, width: 0, detailInset: 0 };

  return width >= WIDE_LAYOUT_BREAKPOINT
    ? { visible: true, width: DEFAULT_SIDEBAR_WIDTH, detailInset: 0 }
    : { visible: false, width: 0, detailInset: 0 };
}

function isVerticalDivision(region: DuoReservedRegion, windowHeight: number) {
  return (
    region.frame.height >= windowHeight * 0.5 &&
    region.frame.height > region.frame.width
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function Destination({
  lab,
  selected,
  onPress,
}: {
  lab: (typeof labs)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const palette = useDuoPalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destination,
        selected && { backgroundColor: palette.indigoSoft },
        pressed && styles.pressed,
      ]}
    >
      <Symbol color={palette.indigo} name={lab.symbol} size={24} />
      <View style={styles.destinationCopy}>
        <Text
          numberOfLines={1}
          style={[
            styles.destinationTitle,
            { color: palette.text },
            selected && { fontWeight: '600' },
          ]}
        >
          {lab.label}
        </Text>
        <Text
          style={[styles.destinationSubtitle, { color: palette.secondary }]}
        >
          {lab.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  root: { flex: 1 },
  rootWide: { flexDirection: 'row' },
  sidebar: { paddingHorizontal: 20 },
  sidebarHeader: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  sidebarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  sidebarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinations: { gap: 3 },
  destination: {
    minHeight: 60,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  destinationCopy: { flex: 1, gap: 2 },
  destinationTitle: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  destinationSubtitle: { fontSize: 12, lineHeight: 15 },
  detail: { flex: 1, minWidth: 0 },
  content: { flex: 1, minHeight: 0 },
  compactBar: {
    zIndex: 10,
    height: 84,
    overflow: 'visible',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  compactTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    alignItems: 'flex-end',
  },
  menuBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.18)' },
  menuPanel: {
    width: '100%',
    maxWidth: 380,
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    height: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalList: { padding: 14, gap: 4 },
  pressed: { opacity: 0.62 },
});
