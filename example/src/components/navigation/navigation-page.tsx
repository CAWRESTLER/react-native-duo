import {
  DuoNavigationToolbar,
  type DuoNavigationToolbarItem,
  type DuoNavigationToolbarState,
} from '@cawrestler/react-native-duo';
import { useIsFocused } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NavigationPage({
  children,
  items = [],
  onItemPress,
}: PropsWithChildren<{
  items?: DuoNavigationToolbarItem[];
  onItemPress?: (id: string) => void;
}>) {
  const active = useIsFocused();
  const [state, setState] = useState<DuoNavigationToolbarState>();
  return (
    <SafeAreaView
      edges={Platform.OS === 'ios' ? [] : ['left', 'right', 'bottom']}
      style={navigationStyles.fill}
    >
      <DuoNavigationToolbar
        active={active}
        items={items}
        horizontalPresentation="inline"
        tintColor="#6155F5"
        onItemPress={onItemPress}
        onStateChange={setState}
        background={<View style={navigationStyles.background} />}
      >
        <ScrollView
          testID="navigation-scroll"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={navigationStyles.page}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={navigationStyles.heading}>
            Navigator ownership
          </Text>
          <Text style={navigationStyles.body}>
            The native navigator owns this header, back button, and tabs. Duo
            owns only screen actions: inline when horizontal, in the existing
            stack when vertical. It does not create another stack or tab
            controller.
          </Text>
          <Text
            testID="navigation-attachment"
            style={navigationStyles.diagnostic}
          >
            Toolbar: {state?.attachment ?? 'measuring'} ·{' '}
            {state?.isVertical ? 'vertical' : 'horizontal'}
            {' · '}
            {state?.actionPresentation ?? 'measuring'}
          </Text>
          <Text style={navigationStyles.diagnostic}>
            Applied insets:{' '}
            {state ? JSON.stringify(state.contentInsets) : 'measuring'}
          </Text>
          {children}
          {Array.from({ length: 12 }, (_, index) => (
            <Text key={index} style={navigationStyles.row}>
              Scroll row {index + 1} — fold or rotate without resetting this
              list.
            </Text>
          ))}
          <Text testID="navigation-scroll-end" style={navigationStyles.body}>
            End of list. Buttons and fields above should stay reachable in every
            pose.
          </Text>
        </ScrollView>
      </DuoNavigationToolbar>
    </SafeAreaView>
  );
}

export const navigationStyles = StyleSheet.create({
  fill: { flex: 1 },
  background: { flex: 1, backgroundColor: '#F2F2F7' },
  page: { padding: 20, gap: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111114' },
  body: { fontSize: 17, color: '#111114' },
  diagnostic: { fontSize: 13, color: '#6D6D72' },
  row: {
    paddingVertical: 12,
    fontSize: 17,
    color: '#111114',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9D9DF',
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#6D6D72',
    borderRadius: 12,
    padding: 12,
    fontSize: 17,
    color: '#111114',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  button: { padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF' },
  buttonText: { fontSize: 17, color: '#6155F5', fontWeight: '600' },
});
