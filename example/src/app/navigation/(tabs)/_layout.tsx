import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

export default function TabsLayout() {
  if (Platform.OS !== 'ios')
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
        <Tabs.Screen name="settings" options={{ title: 'Ownership' }} />
      </Tabs>
    );
  return (
    <NativeTabs>
      <NativeTabs.Trigger
        name="notes"
        disableAutomaticContentInsets
        disablePopToTop
        disableScrollToTop
      >
        <NativeTabs.Trigger.Label>Notes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="note.text" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Ownership</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
