import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  background: '#080B12',
  panel: '#111827',
  panelRaised: '#182236',
  border: '#29354A',
  text: '#F8FAFC',
  muted: '#9BA9BF',
  accent: '#67E8F9',
  accentDark: '#164E63',
  green: '#86EFAC',
  greenDark: '#14532D',
  amber: '#FDE68A',
  amberDark: '#713F12',
  red: '#FDA4AF',
  redDark: '#881337',
};

export function DemoScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ComponentIntro({
  name,
  summary,
  useFor,
  native,
  fallback,
}: {
  name: string;
  summary: string;
  useFor: string;
  native: string;
  fallback: string;
}) {
  return (
    <Card title={name}>
      <Text style={styles.paragraph}>{summary}</Text>
      <Metric label="Use it for" value={useFor} />
      <Metric label="Duo implementation" value={native} />
      <Metric label="Other platforms" value={fallback} />
    </Card>
  );
}

export function PropReference({
  rows,
}: {
  rows: readonly {
    name: string;
    type: string;
    description: string;
    defaultValue?: string;
  }[];
}) {
  return (
    <View style={styles.propList}>
      {rows.map((row) => (
        <View key={row.name} style={styles.propRow}>
          <View style={styles.propHeading}>
            <Text selectable style={styles.propName}>
              {row.name}
            </Text>
            <Text selectable style={styles.propType}>
              {row.type}
            </Text>
          </View>
          <Text style={styles.propDescription}>{row.description}</Text>
          {row.defaultValue ? (
            <Text style={styles.propDefault}>Default: {row.defaultValue}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Hero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroBody}>{body}</Text>
    </View>
  );
}

export function Card({
  children,
  title,
  style,
}: {
  children: ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'good' | 'warning' | 'bad' | 'neutral';
}) {
  return (
    <View style={[styles.pill, pillTones[tone]]}>
      <Text style={[styles.pillText, pillTextTones[tone]]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text selectable style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.control}>
      <Text style={styles.controlLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onChange(option)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  selected && styles.choiceTextSelected,
                ]}
              >
                {humanize(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.actionButton}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accentDark }}
        value={value}
      />
    </View>
  );
}

export function CodeSample({ children }: { children: string }) {
  return (
    <View style={styles.codeBox}>
      <Text selectable style={styles.codeText}>
        {children.trim()}
      </Text>
    </View>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

function humanize(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase());
}

const pillTones = StyleSheet.create({
  good: { backgroundColor: colors.greenDark },
  warning: { backgroundColor: colors.amberDark },
  bad: { backgroundColor: colors.redDark },
  neutral: { backgroundColor: colors.panelRaised },
});

const pillTextTones = StyleSheet.create({
  good: { color: colors.green },
  warning: { color: colors.amber },
  bad: { color: colors.red },
  neutral: { color: colors.accent },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  scrollView: { flex: 1, minHeight: 0 },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 80,
    gap: 16,
  },
  hero: { gap: 8, marginBottom: 2 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 680,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  paragraph: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  metric: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 9,
  },
  metricLabel: { color: colors.muted, fontSize: 14, flexShrink: 1 },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  control: { gap: 8 },
  controlLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: {
    backgroundColor: colors.panelRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  choiceSelected: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accent,
  },
  choiceText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  choiceTextSelected: { color: colors.accent },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: { color: '#083344', fontSize: 15, fontWeight: '800' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  propList: { gap: 14 },
  propRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 13,
    gap: 5,
  },
  propHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  propName: {
    color: colors.accent,
    fontFamily: 'Menlo',
    fontSize: 13,
    fontWeight: '700',
  },
  propType: {
    color: colors.amber,
    fontFamily: 'Menlo',
    fontSize: 11,
  },
  propDescription: { color: colors.text, fontSize: 13, lineHeight: 19 },
  propDefault: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  bulletList: { gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: { color: colors.accent, fontSize: 16, lineHeight: 20 },
  bulletText: { color: colors.muted, flex: 1, fontSize: 14, lineHeight: 20 },
  codeBox: { backgroundColor: '#030712', borderRadius: 14, padding: 14 },
  codeText: {
    color: '#C4F1F9',
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 18,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
