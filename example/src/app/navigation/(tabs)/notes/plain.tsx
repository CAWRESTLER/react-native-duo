import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDraft } from '@/components/navigation/draft-context';
import { navigationStyles as styles } from '@/components/navigation/navigation-page';

// No adapter here: exercise releasing actions to an ordinary native-stack screen.
export default function PlainScreen() {
  const { draft } = useDraft();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.fill}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
        contentContainerStyle={styles.page}
      >
        <Text accessibilityRole="header" style={styles.heading}>
          No Duo toolbar on this screen
        </Text>
        <Text style={styles.body}>
          This is an ordinary native-stack screen, with no DuoNavigationToolbar.
          Its native header, back button, and tabs remain. The previous screen's
          action toolbar must be released rather than leaving an empty action
          rail. SafeAreaView owns the remaining left, right, and bottom insets;
          the non-transparent native header owns the top.
        </Text>
        <Text testID="plain-screen-draft" style={styles.body}>
          Shared draft: {draft}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
