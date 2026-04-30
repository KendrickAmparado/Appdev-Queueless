import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import { requestStaffPasswordReset } from '../../../firebase';
import GlassCard from '../../../src/components/GlassCard';
import { colors, spacing } from '../../../src/theme';

export default function StaffForgotPasswordEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setError('');

    if (!email) {
      setError('Please enter your email.');
      return;
    }

    try {
      setLoading(true);
      await requestStaffPasswordReset(email.trim());
      navigation.navigate('StaffForgotPasswordCode', { email: email.trim() });
    } catch (authError) {
      setError(authError.message || 'Unable to send reset code.');
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
          <Text style={styles.badge}>Reset Password</Text>
          <Text style={styles.title}>Enter your email</Text>
          <Text style={styles.subtitle}>We will send a 6-digit code to your staff email.</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.ink500}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={handleSend} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Send Code</Text>
                  <FontAwesome5 name="paper-plane" size={12} color="#FFFFFF" solid />
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
