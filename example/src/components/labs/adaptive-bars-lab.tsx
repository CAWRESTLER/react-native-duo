import {
  DuoAdaptiveToolbar,
  type DuoToolbarItem,
  type DuoToolbarState,
  type DuoVerticalBarCompression,
} from '@cawrestler/react-native-duo';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLabNavigation } from '@/components/duo-shell';

import {
  AvailabilityRow,
  BodyText,
  Caption,
  DemoPage,
  LabCard,
  SegmentedControl,
  StatusLine,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';

type Tab = 'workbench' | 'inbox' | 'profile';

const initialState: DuoToolbarState = {
  native: false,
  verticalBarEdge: 'unavailable',
  isVertical: false,
  contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
};

export function AdaptiveBarsLab() {
  const palette = useDuoPalette();
  const navigation = useLabNavigation();
  const [verticalDisabled, setVerticalDisabled] = useState(false);
  const [compression, setCompression] =
    useState<DuoVerticalBarCompression>('automatic');
  const [tab, setTab] = useState<Tab>('workbench');
  const [event, setEvent] = useState('Interact with a toolbar item');
  const [toolbarState, setToolbarState] = useState(initialState);
  const items = useMemo<DuoToolbarItem[]>(
    () => [
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
        id: 'close',
        title: 'Close',
        systemImage: 'xmark',
        placement: 'cancellationAction',
      },
      {
        id: 'favorite',
        title: 'Favorite',
        systemImage: 'star.fill',
        placement: 'pinnedTrailing',
        visibilityPriority: 'high',
      },
      {
        id: 'compass',
        title: 'Compass',
        systemImage: 'safari',
        verticalSystemImage: 'safari.fill',
        placement: 'bottomBar',
        axisBehavior: 'verticalPreferred',
        visibilityPriority: 'high',
      },
      {
        id: 'selection',
        title: 'Selection: 3',
        placement: 'bottomBar',
        axisBehavior: 'horizontalOnly',
        visibilityPriority: 'low',
      },
      {
        id: 'inboxAction',
        title: 'Inbox',
        systemImage: 'tray',
        placement: 'bottomBar',
        badge: 7,
        axisBehavior: 'verticalPreferred',
      },
      {
        id: 'overflow',
        title: 'More',
        systemImage: 'ellipsis.circle',
        placement: 'overflow',
        menuItems: [
          { id: 'scan', title: 'Scan', systemImage: 'doc.viewfinder' },
          { id: 'connect', title: 'Connect', systemImage: 'link' },
          { id: 'export', title: 'Export', systemImage: 'square.and.arrow.up' },
        ],
      },
      {
        id: 'workbench',
        title: 'Workbench',
        systemImage: 'hammer',
        placement: 'tab',
        selected: tab === 'workbench',
      },
      {
        id: 'inbox',
        title: 'Inbox',
        systemImage: 'tray',
        placement: 'tab',
        badge: 7,
        selected: tab === 'inbox',
      },
      {
        id: 'profile',
        title: 'Profile',
        systemImage: 'person.crop.circle',
        placement: 'tab',
        selected: tab === 'profile',
      },
    ],
    [tab, navigation.compact]
  );

  const onPress = (id: string) => {
    if (id === 'navigation') {
      navigation.showNavigation();
      return;
    }
    if (id === 'workbench' || id === 'inbox' || id === 'profile') {
      setTab(id);
      return;
    }
    const labels: Record<string, string> = {
      close: 'Cancellation action',
      favorite: 'Pinned favorite',
      compass: 'Vertical-aware custom view',
      selection: 'Horizontal-only selection',
      inboxAction: 'Inbox badge',
      workbench: 'Workbench tab',
      inbox: 'Inbox tab',
      profile: 'Profile tab',
      scan: 'Overflow: Scan',
      connect: 'Overflow: Connect',
      export: 'Overflow: Export',
    };
    setEvent(labels[id] ?? id);
  };

  return (
    <DuoAdaptiveToolbar
      compressionBehavior={compression}
      items={
        tab === 'workbench'
          ? items
          : items.filter(
              (item) => item.placement === 'tab' || item.id === 'navigation'
            )
      }
      onItemPress={onPress}
      onStateChange={setToolbarState}
      showsNavigationBar
      style={styles.root}
      title="Adaptive Bars"
      tintColor={palette.indigo}
      verticalBehavior={verticalDisabled ? 'disabled' : 'automatic'}
    >
      {tab === 'workbench' ? (
        <DemoPage
          subtitle="Watch tabs and tools move to the vertical axis"
          symbol="sidebar.right"
          title="Adaptive Bars"
        >
          <LabCard
            symbol="arrow.left.and.right.righttriangle.left.righttriangle.right"
            title="Current placement"
          >
            <StatusLine active={toolbarState.isVertical} headline>
              {toolbarState.isVertical
                ? `Vertical on ${toolbarState.verticalBarEdge} edge`
                : 'Horizontal bar'}
            </StatusLine>
            <Caption>Last action: {event}</Caption>
          </LabCard>

          <LabCard symbol="slider.horizontal.3" title="Experiments">
            <ToggleRow
              label="Disable vertical bars"
              onChange={setVerticalDisabled}
              value={verticalDisabled}
            />
            <SegmentedControl
              onChange={setCompression}
              options={[
                { label: 'Automatic', value: 'automatic' },
                { label: 'Keep toolbar', value: 'preferBarItems' },
                { label: 'Keep tabs', value: 'preferTabBar' },
              ]}
              value={compression}
            />
          </LabCard>

          <LabCard symbol="shippingbox" title="Configured APIs">
            <AvailabilityRow
              available
              title="Pinned prominent action"
              detail="placement: pinnedTrailing"
            />
            <AvailabilityRow
              available
              title="Custom vertical representation"
              detail="axisBehavior: verticalPreferred"
            />
            <AvailabilityRow
              available
              title="Horizontal-only item"
              detail="axisBehavior: horizontalOnly"
            />
            <AvailabilityRow
              available
              title="Priority and overflow"
              detail="visibilityPriority and native menuItems"
            />
          </LabCard>
        </DemoPage>
      ) : (
        <SimpleTab tab={tab} />
      )}
    </DuoAdaptiveToolbar>
  );
}

function SimpleTab({ tab }: { tab: Exclude<Tab, 'workbench'> }) {
  const palette = useDuoPalette();
  const inbox = tab === 'inbox';
  return (
    <View style={[styles.simpleTab, { backgroundColor: palette.grouped }]}>
      <Symbol
        color={inbox ? '#007AFF' : '#AF52DE'}
        name={inbox ? 'tray.full' : 'person.crop.circle'}
        size={52}
      />
      <Text style={[styles.simpleTitle, { color: palette.text }]}>
        {inbox ? 'Inbox' : 'Profile'}
      </Text>
      <BodyText secondary body>
        Change the Duo pose to watch the tab bar adapt.
      </BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  simpleTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  simpleTitle: { fontSize: 28, fontWeight: '700' },
});
