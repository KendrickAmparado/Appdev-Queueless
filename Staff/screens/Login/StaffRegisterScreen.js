import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { registerStaff } from '../../../firebase';
import GlassCard from '../../../src/components/GlassCard';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function StaffRegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [officeDepartment, setOfficeDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');

    if (!name || !contactNumber || !officeDepartment || !email || !password || !confirmPassword) {
      setError('Please complete all required fields.');
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
      await registerStaff({
        name: name.trim(),
        contactNumber: contactNumber.trim(),
        officeDepartment: officeDepartment.trim(),
        email: email.trim(),
        password,
      });
    } catch (authError) {
      setError(authError.message || 'Unable to register staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#DDFCF7', '#E6FFFB', '#FFF1F4']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GlassCard style={styles.card}>
          <Text style={styles.badge}>Staff Register</Text>
          <Text style={[typography.title, styles.title]}>Create Staff Account</Text>
          <Text style={[typography.subtitle, styles.subtitle]}>
            Register your staff profile to access queue controls and QR generation tools.
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.ink500}
            />
            <TextInput
              style={styles.input}
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              placeholder="Contact number"
              placeholderTextColor={colors.ink500}
            />
            <TextInput
              style={styles.input}
              value={officeDepartment}
              onChangeText={setOfficeDepartment}
              placeholder="Office or department"
              placeholderTextColor={colors.ink500}
            />
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
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm password"
              placeholderTextColor={colors.ink500}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Register</Text>}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('StaffLogin')}>
              <Text style={styles.helper}>Already registered? Login instead.</Text>
            </Pressable>
          </View>
        </GlassCard>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 42,
  },
  card: {
    width: '100%',
    maxWidth: 500,
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
