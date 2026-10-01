import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';

export type DuoPalette = {
  grouped: string;
  surface: string;
  elevated: string;
  separator: string;
  text: string;
  secondary: string;
  tertiary: string;
  indigo: string;
  indigoSoft: string;
  green: string;
  orange: string;
  pink: string;
  shadow: string;
};

const palettes: Record<'light' | 'dark', DuoPalette> = {
  light: {
    grouped: '#F2F2F7',
    surface: '#FFFFFF',
    elevated: '#F7F7FA',
    separator: '#D9D9DF',
    text: '#111114',
    secondary: '#6D6D72',
    tertiary: '#9A9AA1',
    indigo: '#6155F5',
    indigoSoft: '#ECECEE',
    green: '#34C759',
    orange: '#FF9500',
    pink: '#FF2D55',
    shadow: '#000000',
  },
  dark: {
    grouped: '#000000',
    surface: '#1C1C1E',
    elevated: '#2C2C2E',
    separator: '#3A3A3C',
    text: '#FFFFFF',
    secondary: '#AEAEB2',
    tertiary: '#737377',
    indigo: '#7D7AFF',
    indigoSoft: '#282750',
    green: '#30D158',
    orange: '#FF9F0A',
    pink: '#FF375F',
    shadow: '#000000',
  },
};

export function useDuoPalette() {
  return palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function Symbol({
  name,
  color,
  size = 20,
  weight = 'regular',
}: {
  name: SFSymbol;
  color: string;
  size?: number;
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  return (
    <SymbolView
      fallback={<Text style={{ color, fontSize: size }}>◆</Text>}
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
    />
  );
}

export function DemoPage({
  title,
  subtitle,
  symbol,
  children,
  contentStyle,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  symbol: SFSymbol;
  contentStyle?: ScrollViewProps['contentContainerStyle'];
}>) {
  const palette = useDuoPalette();
  return (
    <ScrollView
      alwaysBounceVertical
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.pageContent, contentStyle]}
      showsVerticalScrollIndicator
      style={[styles.page, { backgroundColor: palette.grouped }]}
    >
      <View style={styles.hero}>
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: palette.indigo,
              experimental_backgroundImage: `linear-gradient(to bottom, #9084FF, ${palette.indigo})`,
            },
          ]}
        >
          <Symbol color="#FFFFFF" name={symbol} size={28} weight="semibold" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: palette.text }]}>
            {title}
          </Text>
          <Text style={[styles.heroSubtitle, { color: palette.secondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      {children}
    </ScrollView>
  );
}

export function LabCard({
  title,
  symbol,
  children,
  style,
}: PropsWithChildren<{
  title: string;
  symbol: SFSymbol;
  style?: ViewProps['style'];
}>) {
  const palette = useDuoPalette();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.separator,
        },
        style,
      ]}
    >
      <View style={styles.cardHeading}>
        <Symbol
          color={palette.text}
          name={symbol}
          size={17}
          weight="semibold"
        />
        <Text style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const palette = useDuoPalette();
  const tint = color ?? palette.indigo;
  return (
    <View style={[styles.metric, { backgroundColor: `${tint}1F` }]}>
      <Text style={[styles.metricLabel, { color: palette.secondary }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.metricValue, { color: palette.text }]}
      >
        {value}
      </Text>
    </View>
  );
}

export function AvailabilityRow({
  title,
  detail,
  available,
}: {
  title: string;
  detail: string;
  available: boolean;
}) {
  const palette = useDuoPalette();
  return (
    <View style={styles.availabilityRow}>
      <Symbol
        color={available ? palette.green : palette.secondary}
        name={available ? 'checkmark.circle.fill' : 'minus.circle.fill'}
        size={19}
      />
      <View style={styles.availabilityCopy}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.caption, { color: palette.secondary }]}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

export function StatusLine({
  active,
  children,
  headline = false,
}: PropsWithChildren<{ active: boolean; headline?: boolean }>) {
  const palette = useDuoPalette();
  return (
    <View style={styles.statusLine}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: active ? palette.green : palette.secondary },
        ]}
      />
      <Text
        style={[
          headline ? styles.cardTitle : styles.statusText,
          { color: palette.text },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function BodyText({
  children,
  secondary = false,
  body = false,
}: PropsWithChildren<{ secondary?: boolean; body?: boolean }>) {
  const palette = useDuoPalette();
  return (
    <Text
      style={[
        body ? styles.body : styles.subheadline,
        { color: secondary ? palette.secondary : palette.text },
      ]}
    >
      {children}
    </Text>
  );
}

export function Caption({ children }: PropsWithChildren) {
  const palette = useDuoPalette();
  return (
    <Text style={[styles.caption, { color: palette.secondary }]}>
      {children}
    </Text>
  );
}

export function Divider() {
  const palette = useDuoPalette();
  return (
    <View style={[styles.divider, { backgroundColor: palette.separator }]} />
  );
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const palette = useDuoPalette();
  return (
    <View style={styles.controlGroup}>
      {label ? (
        <Text style={[styles.controlLabel, { color: palette.text }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.segmented, { backgroundColor: palette.elevated }]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                selected && {
                  backgroundColor: palette.surface,
                  shadowColor: palette.shadow,
                  shadowOpacity: 0.12,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentText,
                  { color: selected ? palette.text : palette.secondary },
                  selected && styles.segmentTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const palette = useDuoPalette();
  return (
    <View
      style={[
        styles.toggleRow,
        compact && styles.toggleRowCompact,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          compact ? styles.subheadline : styles.body,
          { color: palette.text },
        ]}
      >
        {label}
      </Text>
      <Switch
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: palette.separator, true: palette.green }}
        value={value}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  symbol,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  symbol?: SFSymbol;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const palette = useDuoPalette();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: secondary ? palette.indigoSoft : palette.indigo,
          opacity: disabled ? 0.42 : pressed ? 0.72 : 1,
        },
      ]}
    >
      {symbol ? (
        <Symbol
          color={secondary ? palette.indigo : '#FFFFFF'}
          name={symbol}
          size={17}
        />
      ) : null}
      <Text
        style={[
          styles.primaryButtonText,
          { color: secondary ? palette.indigo : '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function KeyValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const palette = useDuoPalette();
  return (
    <View style={styles.keyValue}>
      <Text style={[styles.body, { color: palette.text }]}>{label}</Text>
      <Text style={[styles.keyValueText, { color: palette.secondary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 20,
    gap: 20,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 3 },
  heroTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  heroSubtitle: { fontSize: 17, lineHeight: 22 },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    gap: 14,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  metric: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 3,
  },
  metricLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  availabilityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  availabilityCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { flexShrink: 1, fontSize: 15, lineHeight: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 8 },
  body: { fontSize: 17, lineHeight: 22 },
  subheadline: { fontSize: 15, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 15 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  controlGroup: { gap: 7 },
  controlLabel: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  segmented: { flexDirection: 'row', borderRadius: 999, padding: 2 },
  segment: {
    flex: 1,
    minHeight: 28,
    paddingHorizontal: 7,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentTextSelected: { fontWeight: '600' },
  pressed: { opacity: 0.65 },
  toggleRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  toggleRowCompact: { minHeight: 31 },
  disabled: { opacity: 0.45 },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600' },
  keyValue: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyValueText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
