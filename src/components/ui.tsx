import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Simgedeki renkler: kırmızı otobüs, sarı raylı sistem, mavi deniz, lacivert zemin
export const Brand = {
  red: '#E3141E',
  blue: '#0B5CAD',
  green: '#1E8E3E',
  orange: '#E58A00',
  ferry: '#0F7DB8',
  rail: '#F5B700',
  navy: '#101C3A',
};

export function T({ style, dim, bold, size, color, ...p }: TextProps & { dim?: boolean; bold?: boolean; size?: number; color?: string }) {
  const c = useTheme();
  return (
    <Text
      {...p}
      style={[
        { color: color ?? (dim ? c.textSecondary : c.text), fontSize: size ?? 15 },
        bold && { fontWeight: '700' },
        style,
      ]}
    />
  );
}

export function Card({ style, ...p }: ViewProps) {
  const c = useTheme();
  return <View {...p} style={[styles.card, { backgroundColor: c.backgroundElement }, style]} />;
}

export function Row({
  onPress,
  left,
  title,
  subtitle,
  right,
  style,
}: {
  onPress?: PressableProps['onPress'];
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.backgroundSelected : 'transparent' }, style]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? <T bold numberOfLines={2}>{title}</T> : title}
        {subtitle ? typeof subtitle === 'string' ? <T dim size={13} numberOfLines={2}>{subtitle}</T> : subtitle : null}
      </View>
      {right}
    </Pressable>
  );
}

export function LineBadge({ code, color = Brand.blue, style }: { code: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={styles.badgeText} numberOfLines={1}>
        {code}
      </Text>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <T dim bold size={13} style={{ letterSpacing: 0.5 }}>
        {typeof children === 'string' ? children.toLocaleUpperCase('tr-TR') : children}
      </T>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? color ?? Brand.blue : c.backgroundElement }]}>
      <Text style={{ color: active ? '#fff' : c.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Button({ title, onPress, color = Brand.red, style, textStyle, disabled }: { title: string; onPress?: () => void; color?: string; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}>
      <Text style={[{ color: '#fff', fontWeight: '700', fontSize: 15 }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
      {label ? <T dim size={13}>{label}</T> : null}
    </View>
  );
}

export function ErrorBox({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <Card style={{ gap: 8, alignItems: 'flex-start' }}>
      <T bold>Veri alınamadı</T>
      <T dim size={13}>{error.message}</T>
      {onRetry ? <Button title="Tekrar dene" onPress={onRetry} color={Brand.blue} /> : null}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <T dim>{text}</T>
    </View>
  );
}

export function Separator() {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.backgroundSelected, marginLeft: 16 }} />;
}

export function Avatar({ name, color, size = 44 }: { name?: string; color?: string; size?: number }) {
  const initials =
    (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toLocaleUpperCase('tr-TR'))
      .join('') || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? Brand.red, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Row title={<T>{title}</T>} subtitle={subtitle} right={<Switch value={value} onValueChange={onChange} trackColor={{ true: Brand.red }} thumbColor="#fff" />} />;
}

/** Birkaç seçenekten birini seçtiren satır. */
export function ChoiceRow<V extends string | number>({
  title,
  subtitle,
  value,
  options,
  onChange,
}: {
  title: string;
  subtitle?: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      <View style={{ gap: 2 }}>
        <T>{title}</T>
        {subtitle ? <T dim size={13}>{subtitle}</T> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Chip key={String(o.value)} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} color={Brand.red} />
        ))}
      </View>
    </View>
  );
}

export function minutesColor(m?: number) {
  if (m === undefined) return Brand.blue;
  if (m <= 3) return Brand.red;
  if (m <= 10) return Brand.orange;
  return Brand.green;
}

export function trafficColor(v: number) {
  if (v < 30) return Brand.green;
  if (v < 55) return Brand.orange;
  return Brand.red;
}

export function timeAgo(d?: Date) {
  if (!d) return '';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  badge: { minWidth: 48, paddingHorizontal: 8, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  button: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  center: { padding: 32, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
