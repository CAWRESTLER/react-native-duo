import { router } from 'expo-router';
import { Text } from 'react-native';
import { useDraft } from '@/components/navigation/draft-context';
import {
  NavigationPage,
  navigationStyles as styles,
} from '@/components/navigation/navigation-page';

export default function DetailScreen() {
  const { draft } = useDraft();
  return (
    <NavigationPage
      items={[
        {
          id: 'compose',
          title: 'Edit draft',
          systemImage: 'square.and.pencil',
        },
      ]}
      onItemPress={() => router.push('/navigation/notes/compose')}
    >
      <Text style={styles.body}>
        Native-stack owns the back gesture and back button. Duo does not
        synthesize a second back action.
      </Text>
      <Text testID="navigation-detail-draft" style={styles.body}>
        {draft}
      </Text>
    </NavigationPage>
  );
}
