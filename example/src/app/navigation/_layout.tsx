import { Slot } from 'expo-router';
import { DraftProvider } from '@/components/navigation/draft-context';

export default function NavigationLayout() {
  return (
    <DraftProvider>
      <Slot />
    </DraftProvider>
  );
}
