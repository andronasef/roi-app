import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { formatArabicDate, toArabicDigits } from '@roi/shared';

export default function HomeScreen() {
  const isRtl = I18nManager.isRTL;
  const todayLabel = formatArabicDate(new Date());
  const rtlStatus = isRtl ? 'RTL: مفعّل' : 'RTL: غير مفعّل';
  const sampleNumber = toArabicDigits(123);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        روعي
      </Text>
      <Text style={styles.subtitle}>{todayLabel}</Text>
      <Text style={styles.meta}>
        {rtlStatus} · {sampleNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#FAF6EC',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2B2620',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#2B2620',
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: '#6B6257',
    textAlign: 'center',
  },
});
