import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import GlassCard from '../../../src/components/GlassCard';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function AdminWelcomeScreen({ navigation }) {
  return (
    <LinearGradient colors={['#DDFCF7', '#E6FFFB', '#FFF1F4']} style={styles.container}>
      <View style={styles.content}>
        <GlassCard style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={require('../../../assets/keke.png')} style={styles.centerLogo} resizeMode="cover" />
          </View>
          <Text style={styles.badge}>Web Admin</Text>
          <Text style={[typography.title, styles.title]}>Welcome, QueueLess </Text>
          <Text style={[typography.subtitle, styles.subtitle]}>
            Monitor pending accounts, staff QR activities, and reports from one secure dashboard.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            <Text style={styles.primaryText}>Go To Admin Login</Text>
          </Pressable>
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
    maxWidth: 560,
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
    fontSize: 40,
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
    width: 150,
    height: 150,
    borderRadius: 150,
  },
});
