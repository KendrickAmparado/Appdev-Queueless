import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { signInStaff } from '../../../firebase';
import GlassCard from '../../../src/components/GlassCard';
import { colors, radius, spacing, typography } from '../../../src/theme';

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
      // Let AppNavigator react to auth state and staff profile changes
      // AppNavigator listens for onAuthStateChanged and watchStaffProfile to route appropriately.
      // Avoid navigating to nested screens (`AwaitingApproval`) here to prevent navigator errors.
      void credential;
    } catch (authError) {
      setError(authError.message || 'Unable to sign in staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#DDFCF7', '#E6FFFB', '#FFF1F4']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <GlassCard style={styles.card}>
          <Text style={styles.badge}>Staff Login</Text>
          <Text style={[typography.title, styles.title]}>Access Staff</Text>
          <Text style={[typography.subtitle, styles.subtitle]}>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('StaffRegister')}>
              <Text style={styles.helper}>No account yet? Register here.</Text>
            </Pressable>
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: colors.cardStrong,
    padding: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    color: colors.primary,
    fontWeight: '800',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  form: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.cardStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: colors.ink900,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  helper: {
    marginTop: spacing.sm,
    color: colors.ink700,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
  },
  
});
