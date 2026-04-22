import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import {
  auth,
  logoutCurrentUser,
  updateCurrentStaffProfile,
  updateCurrentStaffAvatar,
  watchStaffProfile,
} from '../../firebase';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [officeDepartment, setOfficeDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [pendingAvatarUri, setPendingAvatarUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    const unsubscribe = watchStaffProfile(uid, (profile) => {
      setName(profile?.name || auth.currentUser?.displayName || '');
      setContactNumber(profile?.contactNumber || '');
      setOfficeDepartment(profile?.officeDepartment || '');
      setEmail(profile?.email || auth.currentUser?.email || '');
      setAvatarUri(profile?.avatarUri || '');
      setPendingAvatarUri('');
    });

    return unsubscribe;
  }, []);

  const handlePickAvatar = async () => {
    setError('');
    setMessage('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Gallery permission is required to change avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        setError('Unable to process selected image. Please try another image.');
        return;
      }

      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      setPendingAvatarUri(dataUri);
      setMessage('Avatar selected. Tap Save Changes to apply.');
    } catch (avatarError) {
      setError(avatarError.message || 'Unable to update avatar.');
    }
  };

  const handleSaveChanges = async () => {
    setError('');
    setMessage('');

    if (!name.trim() || !contactNumber.trim()) {
      setError('Name and contact number are required.');
      return;
    }

    try {
      setLoading(true);
      await updateCurrentStaffProfile({
        name: name.trim(),
        contactNumber: contactNumber.trim(),
      });

      if (pendingAvatarUri) {
        await updateCurrentStaffAvatar(pendingAvatarUri);
      }

      setPendingAvatarUri('');
      setMessage('Updated successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setError('');
    setMessage('');

    try {
      await logoutCurrentUser();
    } catch (logoutError) {
      setError(logoutError.message || 'Unable to log out. Please try again.');
    }
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Staff"
        title="Profile"
        subtitle="Your registered account details and profile avatar."
      />

      <GlassCard style={styles.card}>
        <View style={styles.avatarRow}>
          <Image
            source={pendingAvatarUri || avatarUri ? { uri: pendingAvatarUri || avatarUri } : require('../../assets/icon.png')}
            style={styles.avatar}
          />
          <Pressable style={styles.primaryButton} onPress={handlePickAvatar} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Change Avatar</Text>}
          </Pressable>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.ink500}
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="Contact number"
            placeholderTextColor={colors.ink500}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Office or Department</Text>
          <Text style={styles.value}>{officeDepartment || '-'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email || '-'}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable style={styles.saveButton} onPress={handleSaveChanges} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Save Changes</Text>}
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardStrong,
    gap: spacing.sm,
  },
  avatarRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E2E8F0',
  },
  infoRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  label: {
    color: colors.ink700,
    fontWeight: '700',
    marginBottom: 2,
  },
  value: {
    color: colors.ink900,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: colors.ink900,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.success,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.ink700,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
  },
  success: {
    color: colors.success,
    fontWeight: '600',
  },
});
