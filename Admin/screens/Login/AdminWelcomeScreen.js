import { Pressable, StyleSheet, Text, View, Image } from 'react-native';

import GlassCard from '../../../src/components/GlassCard';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function AdminWelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <GlassCard style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={require('../../../assets/keke.png')} style={styles.centerLogo} resizeMode="cover" />
          </View>
          <Text style={styles.badge}>Web Admin</Text>
          <Text style={[typography.title, styles.title]}>Welcome to QueueLess Admin</Text>
          <Text style={[typography.subtitle, styles.subtitle]}>
            Monitor approvals, staff QR activity, and reports from one cleaner dashboard.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            <Text style={styles.primaryText}>Go To Admin Login</Text>
          </Pressable>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: spacing.md,
    fontWeight: '800',
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
  },
  title: {
    fontSize: 38,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: 480,
  },
  primaryButton: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  centerLogo: {
    width: 138,
    height: 138,
    borderRadius: 69,
  },
});
