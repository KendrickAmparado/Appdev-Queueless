import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import { logoutCurrentUser } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function AwaitingApprovalScreen() {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <GlassCard style={styles.card}>
          <View style={styles.iconWrap}>
            <FontAwesome5 name="user-clock" size={28} color={colors.primary} />
          </View>
          <Text style={[typography.title, styles.title]}>Account Pending Approval</Text>
          <Text style={[typography.subtitle, styles.subtitle]}>
            Your staff account is registered. Please wait for admin approval before using the QueueLess staff tools.
          </Text>

          <Pressable style={styles.button} onPress={logoutCurrentUser}>
            <Text style={styles.buttonText}>Log Out</Text>
          </Pressable>
        </GlassCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.cardStrong,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(15, 118, 110, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
