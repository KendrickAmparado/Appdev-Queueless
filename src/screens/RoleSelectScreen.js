import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing, typography } from '../theme';

function RoleCard({ title, subtitle, colorsPack, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.cardPressable}>
      <LinearGradient colors={colorsPack} style={styles.roleCard}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>QueueLess</Text>
      <Text style={typography.title}>Smart Appointment & Queue</Text>
      <Text style={[typography.subtitle, styles.subtitle]}>
        Modern digital queuing for school offices with real-time queue visibility.
      </Text>

      <View style={styles.stack}>
        <RoleCard
          title="Admin Panel"
          subtitle="Pending accounts, staff QR monitoring, and office reports"
          colorsPack={['#0EA5E9', '#2DD4BF']}
          onPress={() => navigation.navigate('AdminWelcome')}
        />
        <RoleCard
          title="Staff Console"
          subtitle="Generate QR, manage queues, and configure office settings"
          colorsPack={['#14B8A6', '#84CC16']}
          onPress={() => navigation.navigate('StaffWelcome')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 82,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#F0FDFA',
  },
  brand: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
    borderRadius: 999,
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
    color: colors.ink700,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 340,
  },
  stack: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  cardPressable: {
    borderRadius: radius.lg,
  },
  roleCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 145,
    justifyContent: 'space-between',
  },
  roleTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  roleSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 270,
  },
});
