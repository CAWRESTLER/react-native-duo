import { DuoArrangementView, useDuo } from '@cawrestler/react-native-duo';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ArrangementScreen() {
  const { isDuo, hinge, platform } = useDuo();

  return (
    <DuoArrangementView
      style={styles.fill}
      primary={
        <Pane
          title="Primary pane"
          lines={[
            `Platform: ${platform}`,
            isDuo ? 'Duo hardware or simulator' : 'Non-Duo fallback layout',
          ]}
        />
      }
      secondary={
        <Pane
          title="Secondary pane"
          lines={[
            `Hinge: ${hinge.status}`,
            hinge.available
              ? `${hinge.angleDegrees.toFixed(1)}°`
              : 'Hinge unavailable',
          ]}
        />
      }
    />
  );
}

function Pane({ title, lines }: { title: string; lines: string[] }) {
  return (
    <ScrollView contentContainerStyle={styles.pane}>
      <Text style={styles.title}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pane: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  line: { fontSize: 15, color: '#3C3C43' },
});
