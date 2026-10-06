import {
  DuoNavigationToolbar,
  type DuoNavigationToolbarState,
} from '@cawrestler/react-native-duo';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';

export default function ToolbarScreen() {
  const active = useIsFocused();
  const [toolbar, setToolbar] = useState<DuoNavigationToolbarState>();
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <DuoNavigationToolbar
      active={active}
      horizontalPresentation="inline"
      tintColor="#5856D6"
      items={[
        {
          id: 'refresh',
          title: 'Refresh',
          systemImage: 'arrow.clockwise',
          placement: 'bottomBar',
        },
        {
          id: 'more',
          title: 'More',
          systemImage: 'ellipsis.circle',
          placement: 'overflow',
          menuItems: [
            { id: 'about', title: 'About starter', systemImage: 'info.circle' },
          ],
        },
      ]}
      onItemPress={(id) => setLastAction(id)}
      onStateChange={setToolbar}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Screen-owned navigation</Text>
        <Text style={styles.body}>
          Expo Router keeps the native header and tabs. Duo adds only this
          screen&apos;s toolbar actions—inline when horizontal, on the existing
          stack rail when vertical on Duo.
        </Text>
        <Text style={styles.mono}>
          Attachment: {toolbar?.attachment ?? 'measuring'} ·{' '}
          {toolbar?.isVertical ? 'vertical' : 'horizontal'}
        </Text>
        {lastAction ? (
          <Text style={styles.mono}>Last action: {lastAction}</Text>
        ) : null}
        {Platform.OS !== 'ios' ? (
          <Text style={styles.note}>
            Android uses the JavaScript toolbar fallback (labeled actions, no SF
            Symbols).
          </Text>
        ) : null}
      </ScrollView>
    </DuoNavigationToolbar>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, color: '#3C3C43' },
  mono: {
    fontSize: 14,
    color: '#636366',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  note: { fontSize: 14, color: '#636366', fontStyle: 'italic' },
});
