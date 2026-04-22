import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as WebBrowser from 'expo-web-browser';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { auth, buildQueueJoinLink, generateStaffQrCode, normalizeStaffQrLinks, watchStaffQrCodes } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function GenerateQrScreen() {
  const [label, setLabel] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    normalizeStaffQrLinks(uid).catch(() => {
      // Ignore migration errors to avoid blocking QR screen.
    });

    const unsubscribe = watchStaffQrCodes(uid, (list) => {
      setItems(list);
    });

    return unsubscribe;
  }, []);

  const latest = useMemo(() => items[0], [items]);

  const handleGenerate = async () => {
    const uid = auth.currentUser?.uid;
    setError('');

    if (!uid) {
      setError('No active staff session found. Please log in again.');
      return;
    }

    if (!label.trim()) {
      setError('Please provide a QR label before generating.');
      return;
    }

    try {
      setLoading(true);
      await generateStaffQrCode(uid, label.trim());
      setLabel('');
    } catch (qrError) {
      setError(qrError.message || 'Failed to generate QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (value) => {
    const link = String(value || '').trim();
    if (!link) return;

    try {
      await WebBrowser.openBrowserAsync(link);
    } catch {
      setError('Unable to open link. Please scan QR directly.');
    }
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Staff"
        title="Generate QR"
        subtitle="Create a fresh queue QR for your office service counter."
      />

      <GlassCard style={styles.qrCard}>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="QR label (example: Registrar Window 2)"
          placeholderTextColor={colors.ink500}
        />

        {latest ? (
          <View style={styles.qrWrap}>
            <QRCode value={latest.value} size={168} />
          </View>
        ) : (
          <Text style={styles.meta}>No QR generated yet.</Text>
        )}

        {latest ? <Text style={styles.code}>{latest.label}</Text> : null}
        {latest ? <Text style={styles.meta}>Latest generated code</Text> : null}
        {latest ? (
          <Pressable onPress={() => handleOpenLink(latest.value || buildQueueJoinLink(latest.uid, latest.id, latest.label))}>
            <Text style={styles.linkText}>{latest.value || buildQueueJoinLink(latest.uid, latest.id, latest.label)}</Text>
          </Pressable>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleGenerate} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Generate New QR</Text>}
        </Pressable>
      </GlassCard>

      {items.length > 1 ? (
        <View style={styles.recentWrap}>
          <Text style={[typography.section, styles.recentTitle]}>Recent Generated QR</Text>
          {items.slice(1, 4).map((item) => (
            <GlassCard key={item.id} style={styles.recentCard}>
              <View style={styles.recentQrWrap}>
                <QRCode value={item.value} size={86} />
              </View>
              <Text style={styles.recentLabel}>{item.label}</Text>
              <Pressable onPress={() => handleOpenLink(item.value || buildQueueJoinLink(item.uid, item.id, item.label))}>
                <Text style={styles.recentLinkText}>{item.value || buildQueueJoinLink(item.uid, item.id, item.label)}</Text>
              </Pressable>
            </GlassCard>
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    alignItems: 'center',
    backgroundColor: colors.cardStrong,
    paddingVertical: spacing.xl,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    color: colors.ink900,
    marginBottom: spacing.md,
  },
  qrWrap: {
    padding: spacing.sm,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  code: {
    marginTop: spacing.md,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink900,
    letterSpacing: 0.5,
  },
  meta: {
    marginTop: 6,
    color: colors.ink500,
  },
  button: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.ink700,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  note: {
    marginTop: spacing.md,
    color: colors.ink500,
    fontStyle: 'italic',
  },
  error: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontWeight: '600',
  },
  linkText: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  recentWrap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  recentTitle: {
    marginBottom: spacing.xs,
  },
  recentCard: {
    backgroundColor: colors.cardStrong,
    alignItems: 'center',
  },
  recentQrWrap: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  recentLabel: {
    color: colors.ink700,
    fontWeight: '700',
  },
  recentLinkText: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 10,
    textAlign: 'center',
  },
});
