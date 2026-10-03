import { Link, router } from 'expo-router';
import { Pressable, Text, TextInput } from 'react-native';
import {
  NavigationPage,
  navigationStyles as styles,
} from '@/components/navigation/navigation-page';
import { useDraft } from '@/components/navigation/draft-context';

export default function NotesScreen() {
  const { draft, setDraft } = useDraft();
  return (
    <NavigationPage
      items={[
        {
          id: 'compose',
          title: 'Edit in modal',
          systemImage: 'square.and.pencil',
        },
      ]}
      onItemPress={() => router.push('/navigation/notes/compose')}
    >
      <Text style={styles.body}>
        Edit this draft, fold and rotate, change tabs, push a detail screen,
        then open its modal. The same draft stays above the route lifecycle.
      </Text>
      <TextInput
        accessibilityLabel="Shared note draft"
        testID="navigation-draft"
        multiline
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
      />
      <Link href="/navigation/notes/detail" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>
            Push detail — native back button
          </Text>
        </Pressable>
      </Link>
      <Link href="/navigation/notes/plain" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>
            Push plain screen — no Duo toolbar
          </Text>
        </Pressable>
      </Link>
      <Link href="/navigation/notes/compose" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Open modal</Text>
        </Pressable>
      </Link>
      <Link href="/" dismissTo asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Return to Duo Lab</Text>
        </Pressable>
      </Link>
    </NavigationPage>
  );
}
