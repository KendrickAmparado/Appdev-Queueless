import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function StatPill({ label, value, tone = 'default' }) {
  const toneStyle =
    tone === 'success'
      ? styles.success
      : tone === 'warning'
      ? styles.warning
      : tone === 'danger'
      ? styles.danger
      : styles.default;

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 100,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  value: {
    color: colors.ink900,
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: colors.ink500,
  },
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: colors.border,
  },
  success: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
});
