import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { buildQueueJoinLink, joinStudentQueueByQrValue } from '../../firebase';
import { registerForPushNotificationsAsync } from '../../src/notifications/registerForPushNotifications';
import { colors, spacing } from '../../src/theme';

export default function StudentScanScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = route?.params?.uid;
    const qrId = route?.params?.qrId;
    const label = route?.params?.label || '';

    if (uid && qrId) {
      setQrValue(buildQueueJoinLink(uid, qrId, label));
      setError('');
    }
  }, [route?.params?.uid, route?.params?.qrId, route?.params?.label]);

  const handleJoin = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your name first.');
      return;
    }

    if (!qrValue.trim()) {
      setError('Invalid QR link. Please scan a valid QueueLess QR code.');
      return;
    }

    try {
      setJoining(true);
      const pushToken = await registerForPushNotificationsAsync();
      const joined = await joinStudentQueueByQrValue(qrValue, name.trim(), {
        pushToken,
      });
      navigation.replace('StudentWaiting', {
        uid: joined.uid,
        queueId: joined.queueId,
        qrLabel: joined.qrLabel,
        studentName: joined.name,
      });
    } catch (joinError) {
      setError(joinError.message || 'Unable to join queue. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Student"
        title="Join Queue"
        subtitle="Enter your name and join the queue from this QR link."
        centered
      />

      <GlassCard style={styles.card}>
        <Text style={styles.meta}>{qrValue ? 'QR link detected.' : 'No QR link detected.'}</Text>
        {qrValue ? <Text style={styles.linkText}>{qrValue}</Text> : null}

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          placeholderTextColor={colors.ink500}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleJoin} disabled={joining}>
          {joining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Join Queue</Text>}
        </Pressable>
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  meta: {
    color: colors.ink500,
    marginBottom: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: colors.ink900,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    marginBottom: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
