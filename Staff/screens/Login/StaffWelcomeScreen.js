import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../../src/theme';

export default function StaffWelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.badge}>QueueLess Staff</Text>
        <Text style={styles.title}>Welcome to QueueLess</Text>
        <Text style={styles.subtitle}>
          Scan, manage, and monitor daily service flow with one clean workspace.
        </Text>

        <View style={styles.actions}>
          <Pressable onPress={() => navigation.navigate('StaffRegister')}>
            <Text style={styles.secondaryText}>Create Account</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('StaffLogin')}>
            <Text style={styles.primaryText}>Let's Start</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: spacing.md,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
  },
  title: {
    maxWidth: 420,
    fontSize: 42,
    lineHeight: 48,
    color: colors.ink900,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: 360,
    color: colors.ink600,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.ink900,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
