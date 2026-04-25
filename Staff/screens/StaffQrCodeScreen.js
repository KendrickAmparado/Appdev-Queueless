import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { FontAwesome5 } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { archiveStaffQrCode, auth, buildQueueJoinLink, normalizeStaffQrLinks, watchStaffQrCodes } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function StaffQrCodeScreen() {
  const [items, setItems] = useState([]);
  const [qrRef, setQrRef] = useState(null);
  const recentRefs = useState({})[0];
  const [showScanCount, setShowScanCount] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    normalizeStaffQrLinks(uid).catch(() => {
      // Ignore migration errors to keep QR list visible.
    });

    const unsubscribe = watchStaffQrCodes(uid, (list) => {
      setItems(list);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('@showScanCount').then((v) => {
      setShowScanCount(v !== '0');
    });
  }, [isFocused]);

  const latest = useMemo(() => items[0], [items]);

  const saveOrShareQrFile = async (fileUri) => {
    const isExpoGo = Constants.appOwnership === 'expo';

    if (!isExpoGo) {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.granted) {
        await MediaLibrary.saveToLibraryAsync(fileUri);
        Alert.alert('Saved', 'QR code downloaded to your device gallery.');
        return;
      }
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri);
      return;
    }

    Alert.alert('Saved', 'QR file is saved in app cache.');
  };

  const handleDownloadQr = async () => {
    if (!latest || !qrRef) {
      Alert.alert('No QR', 'Generate a QR first before downloading.');
      return;
    }

    qrRef.toDataURL(async (data) => {
      try {
        const fileUri = `${FileSystem.cacheDirectory}queueless-${latest.id}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await saveOrShareQrFile(fileUri);
      } catch {
        Alert.alert('Download failed', 'Unable to download QR code right now.');
      }
    });
  };

  const handleDownloadRecentQr = async (item) => {
    const ref = recentRefs[item.id];
    if (!ref) {
      Alert.alert('Unavailable', 'QR preview is still loading. Please try again.');
      return;
    }

    ref.toDataURL(async (data) => {
      try {
        const fileUri = `${FileSystem.cacheDirectory}queueless-${item.id}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await saveOrShareQrFile(fileUri);
      } catch {
        Alert.alert('Download failed', 'Unable to download QR code right now.');
      }
    });
  };

  const handleArchiveQr = async (item) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await archiveStaffQrCode(uid, item.id);
    } catch (error) {
      Alert.alert('Archive failed', error?.message || 'Unable to archive QR code.');
    }
  };

  const handleOpenLink = async (value) => {
    const link = String(value || '').trim();
    if (!link) return;

    try {
      await WebBrowser.openBrowserAsync(link);
    } catch {
      Alert.alert('Unable to open link', 'Please scan the QR or copy the link manually.');
    }
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Staff"
        title="My QR Code"
        subtitle="Display this QR for students to scan and join your queue instantly."
      />

      <GlassCard style={styles.card}>
        {latest ? (
          <View style={styles.qrWrap}>
            <QRCode value={latest.value} size={170} getRef={(ref) => setQrRef(ref)} />
          </View>
        ) : (
          <Text style={styles.emptyText}>Generate a QR first from Generate QR screen.</Text>
        )}

        {latest ? <Text style={styles.label}>{latest.label}</Text> : null}
        {latest && showScanCount ? <Text style={styles.scanCount}>Scans: {latest.scans || 0}</Text> : null}
        {latest ? <Text style={styles.status}>Status: Active</Text> : null}
        {latest ? (
          <Pressable onPress={() => handleOpenLink(latest.value || buildQueueJoinLink(latest.uid, latest.id, latest.label))}>
            <Text style={styles.linkText}>{latest.value || buildQueueJoinLink(latest.uid, latest.id, latest.label)}</Text>
          </Pressable>
        ) : null}
        {latest ? (
          <Pressable style={styles.downloadButton} onPress={handleDownloadQr}>
            <Text style={styles.downloadText}>Download QR Code</Text>
          </Pressable>
        ) : null}
      </GlassCard>

      <Text style={[typography.section, styles.recentTitle]}>Recent Generated QR Code</Text>
      <View style={styles.recentWrap}>
        {items.slice(1, 5).map((item) => (
          <GlassCard key={item.id} style={styles.recentCard}>
            <View style={styles.recentQrWrap}>
              <QRCode value={item.value} size={82} getRef={(ref) => { recentRefs[item.id] = ref; }} />
            </View>
            <View style={styles.recentActionRowColumn}>
              <View style={styles.iconRow}>
                <Pressable style={styles.iconOnlyButton} onPress={() => handleArchiveQr(item)}>
                  <FontAwesome5 name="archive" size={14} color="#FFFFFF" solid />
                </Pressable>
                <Pressable style={styles.iconOnlyButton} onPress={() => handleDownloadRecentQr(item)}>
                  <FontAwesome5 name="download" size={14} color="#FFFFFF" solid />
                </Pressable>
              </View>
            </View>
            <Text style={styles.recentLabel}>{item.label}</Text>
            {showScanCount ? <Text style={styles.recentScan}>Scans: {item.scans || 0}</Text> : null}
            <Pressable onPress={() => handleOpenLink(item.value || buildQueueJoinLink(item.uid, item.id, item.label))}>
              <Text style={styles.recentLinkText}>{item.value || buildQueueJoinLink(item.uid, item.id, item.label)}</Text>
            </Pressable>
          </GlassCard>
        ))}
        {items.length <= 1 ? <Text style={styles.emptyRecent}>No recent QR yet.</Text> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardStrong,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  qrWrap: {
    padding: spacing.sm,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    color: colors.ink500,
    fontWeight: '600',
  },
  label: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink900,
  },
  status: {
    marginTop: 6,
    color: colors.primary,
    fontWeight: '700',
  },
  linkText: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  downloadButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  downloadText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  recentTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  recentCard: {
    width: '48%',
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
    marginLeft: spacing.sm,
  },
  recentLinkText: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 10,
    textAlign: 'center',
    maxWidth: '100%',
  },
  scanCount: {
    marginTop: 6,
    color: colors.ink500,
    fontSize: 12,
    fontWeight: '700',
  },
  recentScan: {
    marginTop: 4,
    color: colors.ink500,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  recentActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  recentActionRowColumn: {
    width: '100%',
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStackButton: {
    width: 48,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink700,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  iconStackLabel: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fullButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fullButtonTextWithIcon: {
    marginLeft: 8,
  },
  fullButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  emptyRecent: {
    color: colors.ink500,
    fontWeight: '600',
  },
});
