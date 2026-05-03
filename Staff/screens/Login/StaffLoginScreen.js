import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import { signInStaff } from '../../../firebase';
import GlassCard from '../../../src/components/GlassCard';
import { colors, spacing } from '../../../src/theme';

export default function StaffLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const credential = await signInStaff(email.trim(), password);
      void credential;
    } catch (authError) {
      setError(authError.message || 'Unable to sign in staff account.');
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
          <Text style={styles.badge}>Staff Login</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to generate QR tokens and manage your office queue in real-time.
          </Text>

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
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={colors.ink500}
            />

            <Pressable onPress={() => navigation.navigate('StaffForgotPasswordEmail', { email })}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <FontAwesome5 name="arrow-right" size={12} color="#FFFFFF" solid />
                </>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('StaffRegister')}>
              <Text style={styles.helper}>No account yet? Register here.</Text>
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
    fontSize: 33,
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
  link: {
    alignSelf: 'flex-end',
    color: colors.primary,
    fontWeight: '600',
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
