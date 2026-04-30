import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import { resetStaffPasswordWithToken } from '../../../firebase';
import GlassCard from '../../../src/components/GlassCard';
import { colors, spacing } from '../../../src/theme';

export default function StaffForgotPasswordResetScreen({ navigation, route }) {
  const email = String(route?.params?.email || '').trim();
  const resetToken = String(route?.params?.resetToken || '').trim();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !resetToken) {
      navigation.replace('StaffLogin');
    }
  }, [email, resetToken, navigation]);

  const handleReset = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('Please complete all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);
      await resetStaffPasswordWithToken(email, resetToken, password);
      Alert.alert('Password updated', 'You can sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('StaffLogin') },
      ]);
    } catch (authError) {
      setError(authError.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <GlassCard style={styles.card}>
          <Text style={styles.badge}>New Password</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>Choose a strong password to secure your account.</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="New password"
              placeholderTextColor={colors.ink500}
            />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm password"
              placeholderTextColor={colors.ink500}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={handleReset} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Update Password</Text>
                  <FontAwesome5 name="lock" size={12} color="#FFFFFF" solid />
                </>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('StaffLogin')}>
              <Text style={styles.helper}>Back to sign in</Text>
            </Pressable>
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  keyboardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: spacing.xl,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 26,
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    color: colors.primaryDark,
    fontWeight: '800',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  title: {
    marginBottom: 6,
    color: colors.ink900,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginBottom: spacing.sm,
    color: colors.ink600,
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: colors.ink900,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  helper: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
