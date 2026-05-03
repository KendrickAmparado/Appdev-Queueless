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

import { requestStaffPasswordReset, verifyStaffPasswordResetCode } from '../../../firebase';
import GlassCard from '../../../src/components/GlassCard';
import { colors, spacing } from '../../../src/theme';

export default function StaffForgotPasswordCodeScreen({ navigation, route }) {
  const email = String(route?.params?.email || '').trim();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigation.replace('StaffLogin');
    }
  }, [email, navigation]);

  const handleVerify = async () => {
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      const resetToken = await verifyStaffPasswordResetCode(email, code);
      if (!resetToken) {
        setError('Invalid code. Please try again.');
        return;
      }
      navigation.navigate('StaffForgotPasswordReset', { email, resetToken });
    } catch (authError) {
      setError(authError.message || 'Unable to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');

    try {
      setLoading(true);
      const result = await requestStaffPasswordReset(email);
      Alert.alert('Email sent', result?.message || 'Reset code sent to your email.');
    } catch (authError) {
      setError(authError.message || 'Unable to resend code.');
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
          <Text style={styles.badge}>Verify Code</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to {email || 'your email'}.</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="6-digit code"
              placeholderTextColor={colors.ink500}
              maxLength={6}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={handleVerify} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Verify Code</Text>
                  <FontAwesome5 name="check" size={12} color="#FFFFFF" solid />
                </>
              )}
            </Pressable>

            <Pressable onPress={handleResend} disabled={loading}>
              <Text style={styles.helper}>Resend code</Text>
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
    textAlign: 'center',
    letterSpacing: 8,
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
