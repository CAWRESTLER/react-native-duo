import { DuoProvider } from '@cawrestler/react-native-duo';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DemoShell } from '../components/demo-shell';
import { colors } from '../components/demo-ui';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <DuoProvider includeInactiveRegions>
          <StatusBar style="light" />
          <DemoShell />
        </DuoProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
