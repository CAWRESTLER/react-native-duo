import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Arrangement', headerTitle: 'DuoArrangementView' }}
      />
      <Tabs.Screen
        name="toolbar"
        options={{ title: 'Toolbar', headerTitle: 'DuoNavigationToolbar' }}
      />
    </Tabs>
  );
}
