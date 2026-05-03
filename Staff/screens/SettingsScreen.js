import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import {
  auth,
  deleteArchivedStaffQrCode,
  restoreArchivedStaffQrCode,
  watchStaffArchivedQrCodes,
} from '../../firebase';
import { colors, spacing } from '../../src/theme';

export default function SettingsScreen() {
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [archivedItems, setArchivedItems] = useState([]);
  const [showScanCount, setShowScanCount] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@showScanCount').then((v) => {
      if (v === '0') setShowScanCount(false);
      if (v === '1') setShowScanCount(true);
    });
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    const unsubscribe = watchStaffArchivedQrCodes(uid, (list) => {
      setArchivedItems(list);
    });

    return unsubscribe;
  }, []);

  const handleDeletePermanently = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await deleteArchivedStaffQrCode(uid, id);
  };

  const handleRestore = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await restoreArchivedStaffQrCode(uid, id);
  };


  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Staff"
        title="Settings"
        subtitle="Manage your queue preferences and archived QR records."
      />

      <GlassCard style={styles.prefCard}>
        <Text style={styles.sectionTitle}>Queue Preferences</Text>

        {/* Queue Notifications removed */}

        <View style={styles.prefRowNoBorder}>
          <View style={styles.prefCopy}>
            <Text style={styles.prefTitle}>Show Scan Count</Text>
            <Text style={styles.prefSubtitle}>Display total scans below each active QR code.</Text>
          </View>
          <Switch
            value={showScanCount}
            onValueChange={async (v) => {
              setShowScanCount(v);
              try {
                await AsyncStorage.setItem('@showScanCount', v ? '1' : '0');
              } catch (e) {
                // ignore
              }
            }}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#A8B6D3', true: colors.primary }}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.prefCard}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Text style={styles.infoText}>
          Archive stores your removed QR records so you can restore them later or delete them permanently.
        </Text>

        <Pressable style={styles.archiveButton} onPress={() => setArchiveVisible(true)}>
          <Text style={styles.archiveText}>Open Archive ({archivedItems.length})</Text>
        </Pressable>
      </GlassCard>


      <Modal
        transparent
        visible={archiveVisible}
        animationType="fade"
        onRequestClose={() => setArchiveVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Archived QR Codes</Text>
            <ScrollView style={styles.listWrap}>
              {archivedItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemRowMain}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <View style={styles.itemButtons}>
                      <Pressable style={styles.restoreButton} onPress={() => handleRestore(item.id)}>
                        <Text style={styles.restoreText}>Restore</Text>
                      </Pressable>
                      <Pressable style={styles.deleteButton} onPress={() => handleDeletePermanently(item.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
              {archivedItems.length === 0 ? <Text style={styles.emptyText}>No archived QR codes yet.</Text> : null}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setArchiveVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </GlassCard>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  archiveButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  archiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  prefCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.ink900,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  prefRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11, 95, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  prefRowNoBorder: {
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  prefCopy: {
    flex: 1,
  },
  prefTitle: {
    color: colors.ink800,
    fontWeight: '700',
    marginBottom: 2,
  },
  prefSubtitle: {
    color: colors.ink500,
    fontSize: 12,
    lineHeight: 18,
  },
  infoText: {
    color: colors.ink700,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '80%',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  modalTitle: {
    color: colors.ink900,
    fontWeight: '800',
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  listWrap: {
    maxHeight: 340,
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  itemRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  itemLabel: {
    color: colors.ink700,
    fontWeight: '700',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  restoreButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  restoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    color: colors.ink500,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  closeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
