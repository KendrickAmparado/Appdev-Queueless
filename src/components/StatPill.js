import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import { colors } from '../theme';

export default function StatPill({ label, value, tone = 'default', icon }) {
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
      <View style={styles.valueRow}>
        {icon ? <FontAwesome5 name={icon} size={14} color={stylesForTone[tone].iconColor} solid /> : null}
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const stylesForTone = {
  default: { iconColor: colors.primary },
  success: { iconColor: colors.success },
  warning: { iconColor: colors.warning },
  danger: { iconColor: colors.danger },
};

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
    fontSize: 22,
    fontWeight: '800',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: colors.ink600,
    fontWeight: '600',
  },
  default: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(22, 163, 74, 0.18)',
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(225, 29, 72, 0.18)',
  },
});
