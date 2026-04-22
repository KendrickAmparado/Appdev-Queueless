import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import GlassCard from '../../../src/components/GlassCard';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function StaffWelcomeScreen({ navigation }) {
  return (
    <LinearGradient colors={['#DDFCF7', '#E6FFFB', '#FFF1F4']} style={styles.container}>
      <View style={styles.content}>
        <GlassCard style={styles.card}>
          <Image source={require('../../../assets/keke.png')} style={styles.logo} />
          <Text style={styles.badge}>Android Staff</Text>
          <Text style={[typography.title, styles.title]}>Welcome, Staff</Text>
          <Text style={[typography.subtitle, styles.subtitle]}>
            Join QueueLess to generate QR codes, manage live queues, and update office settings.
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('StaffLogin')}>
              <Text style={styles.primaryText}>Login</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('StaffRegister')}>
              <Text style={styles.secondaryText}>Create Staff Account</Text>
            </Pressable>
          </View>
        </GlassCard>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.cardStrong,
    padding: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: spacing.md,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: 'rgba(15, 118, 110, 0.16)',
  },
  title: {
    fontSize: 31,
  },
  logo: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: spacing.md,
    borderRadius: 16,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.cardStrong,
  },
  secondaryText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
