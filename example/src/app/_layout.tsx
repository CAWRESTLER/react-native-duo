import { DuoProvider } from '@cawrestler/react-native-duo';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <DuoProvider includeInactiveRegions>
          <StatusBar style="auto" />
          <Slot />
        </DuoProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
});
