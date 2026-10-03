import { Text } from 'react-native';
import {
  NavigationPage,
  navigationStyles as styles,
} from '@/components/navigation/navigation-page';
import { useDraft } from '@/components/navigation/draft-context';
export default function OwnershipScreen() {
  const { draft } = useDraft();
  return (
    <NavigationPage>
      <Text style={styles.body}>
        No Duo actions on this tab. The existing native header and tabs remain;
        the adapter does not reserve a phantom action rail.
      </Text>
      <Text style={styles.body}>
        Safe-area owner: DuoNavigationToolbar on iOS, device SafeAreaView plus
        horizontal fallback on Android/web. ScrollView automatic adjustment is
        disabled.
      </Text>
      <Text style={styles.body}>Current draft: {draft}</Text>
    </NavigationPage>
  );
}
