import { TextInput } from 'react-native';
// Presented by the notes stack, not a hidden outer stack surrounding native tabs.
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationPage,
  navigationStyles as styles,
} from '@/components/navigation/navigation-page';
import { useDraft } from '@/components/navigation/draft-context';
export default function ComposeScreen() {
  const { draft, setDraft } = useDraft();
  // Modal window coordinates need their own provider. Draft context remains inherited.
  return (
    <SafeAreaProvider>
      <NavigationPage>
        <TextInput
          accessibilityLabel="Modal note draft"
          testID="navigation-modal-draft"
          multiline
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
        />
      </NavigationPage>
    </SafeAreaProvider>
  );
}
