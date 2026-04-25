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
      <Text style={styles.brand}>QueueLess Portal</Text>
      <Text style={[typography.title, styles.title]}>Choose Your Workspace</Text>
      <Text style={[typography.subtitle, styles.subtitle]}>
        A cleaner queueing experience for administrators, office staff, and students.
      </Text>

      <View style={styles.stack}>
        <RoleCard
          title="Admin Panel"
          subtitle="Pending accounts, staff QR monitoring, and office reports"
          colorsPack={['#0F766E', '#14B8A6']}
          onPress={() => navigation.navigate('AdminWelcome')}
        />
        <RoleCard
          title="Staff Console"
          subtitle="Generate QR, manage queues, and configure office settings"
          colorsPack={['#1E293B', '#0F766E']}
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
    backgroundColor: colors.secondary,
  },
  brand: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    maxWidth: 420,
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 380,
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
    minHeight: 154,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    elevation: 8,
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
