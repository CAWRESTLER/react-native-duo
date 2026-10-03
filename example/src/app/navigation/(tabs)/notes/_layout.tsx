import { Stack, router } from 'expo-router';
import { Button } from 'react-native';

export const unstable_settings = { initialRouteName: 'index' };

function DoneButton() {
  return <Button title="Done" onPress={() => router.back()} />;
}

export default function NotesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Notes' }} />
      <Stack.Screen name="detail" options={{ title: 'Nested detail' }} />
      <Stack.Screen name="plain" options={{ title: 'Native-only screen' }} />
      <Stack.Screen
        name="compose"
        options={{
          presentation: 'modal',
          title: 'Shared draft',
          headerRight: DoneButton,
        }}
      />
    </Stack>
  );
}
