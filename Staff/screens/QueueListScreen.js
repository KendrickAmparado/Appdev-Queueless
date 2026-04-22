import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { auth, updateQueueStatus, watchStaffQrCodes, watchStaffQueue } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function QueueListScreen() {
  const [walkInName, setWalkInName] = useState('');
  const [queueItems, setQueueItems] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [activeQrId, setActiveQrId] = useState('');
  const [error, setError] = useState('');
  const [waitingModalVisible, setWaitingModalVisible] = useState(false);
  const [successfulModalVisible, setSuccessfulModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const activeQrRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    const unsubscribe = watchStaffQueue(uid, (items) => {
      setQueueItems(items);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    const unsubscribe = watchStaffQrCodes(uid, (items) => {
      setQrCodes(items);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (qrCodes.length === 0) return;

    const hasActive = qrCodes.some((item) => item.id === activeQrId);
    if (!activeQrId || !hasActive) {
      setActiveQrId(qrCodes[0].id);
    }
  }, [qrCodes, activeQrId]);

  const activeQr = useMemo(
    () => qrCodes.find((item) => item.id === activeQrId) || null,
    [qrCodes, activeQrId],
  );

  useEffect(() => {
    activeQrRef.current = activeQr;
  }, [activeQr]);

  const filteredQueueItems = useMemo(() => {
    if (!activeQrId) return [];

    return queueItems.filter((item) => {
      if (item.qrId === activeQrId) return true;

      // Legacy fallback: entries saved before qrId support can still match by qr label.
      if (!item.qrId && item.qrLabel && activeQr?.label && item.qrLabel === activeQr.label) return true;

      return false;
    });
  }, [queueItems, activeQrId, activeQr]);

  const waitingItems = useMemo(
    () => filteredQueueItems.filter((item) => item.status === 'waiting'),
    [filteredQueueItems],
  );
  const waitingPreviewItems = useMemo(() => waitingItems.slice(0, 15), [waitingItems]);
  const servingItems = useMemo(
    () => filteredQueueItems.filter((item) => item.status === 'serving'),
    [filteredQueueItems],
  );
  const successfulItems = useMemo(
    () => filteredQueueItems.filter((item) => item.status === 'successful'),
    [filteredQueueItems],
  );

  // Walk-in functionality removed: walk-ins will no longer be added from this screen.

  const handleMoveToServing = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateQueueStatus(uid, id, 'serving');
  };

  const handleMoveToSuccessful = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateQueueStatus(uid, id, 'successful');
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Staff"
        title="Queue List"
        subtitle="Manage queue flow based on your selected QR code."
      />

      <GlassCard style={styles.qrHeaderCard}>
        <Text style={styles.qrHeaderLabel}>Current QR Label</Text>
        <Text style={styles.qrHeaderValue}>{activeQr?.label || 'No QR selected yet'}</Text>
        <Pressable style={styles.qrChangeButton} onPress={() => setQrModalVisible(true)}>
          <Text style={styles.qrChangeText}>Change QR</Text>
        </Pressable>
      </GlassCard>

      <View style={styles.summaryRow}>
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Serving</Text>
          <Text style={styles.summaryValue}>{servingItems.length}</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Waiting People</Text>
          <Text style={styles.summaryValue}>{waitingItems.length}</Text>
          <Pressable style={styles.summaryButton} onPress={() => setWaitingModalVisible(true)}>
            <Text style={styles.summaryButtonText}>View</Text>
          </Pressable>
        </GlassCard>
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Successful</Text>
          <Text style={styles.summaryValue}>{successfulItems.length}</Text>
          <Pressable style={styles.summaryButton} onPress={() => setSuccessfulModalVisible(true)}>
            <Text style={styles.summaryButtonText}>View</Text>
          </Pressable>
        </GlassCard>
      </View>

      {/* Walk-in removed: adding walk-ins is disabled in this view. */}

      <Text style={[typography.section, styles.sectionTitle]}>Waiting People</Text>
      {waitingItems.length > 15 ? (
        <Text style={styles.previewMeta}>Showing first 15 on screen. Tap View to see all waiting people.</Text>
      ) : null}

      <View style={styles.stack}>
        {servingItems.map((item) => (
          <GlassCard key={item.id} style={styles.cardServingTop}>
            <View style={styles.row}>
              <View style={styles.content}>
                <Text style={styles.servingBadge}>NOW SERVING</Text>
                <Text style={styles.servingName}>{item.name}</Text>
                <Text style={styles.qrTagText}>{item.qrLabel || 'General Queue'}</Text>
              </View>
              <Pressable style={styles.doneButton} onPress={() => handleMoveToSuccessful(item.id)}>
                <Text style={styles.actionButtonText}>Mark Successful</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))}

        {waitingPreviewItems.map((item, index) => (
          <GlassCard key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.position}>#{index + 1}</Text>
              <View style={styles.content}>
                <Text style={styles.token}>Waiting</Text>
                <Text style={styles.student}>{item.name}</Text>
                <Text style={styles.qrTagText}>{item.qrLabel || 'General Queue'}</Text>
              </View>
              <Pressable style={styles.actionButton} onPress={() => handleMoveToServing(item.id)}>
                <Text style={styles.actionButtonText}>Serve</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))}
      </View>

      <Modal transparent visible={waitingModalVisible} animationType="fade" onRequestClose={() => setWaitingModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Waiting People</Text>
            <ScrollView style={styles.modalList}>
              {waitingItems.map((item, index) => (
                <View key={item.id} style={styles.modalRow}>
                  <Text style={styles.modalName}>{index + 1}. {item.name}</Text>
                  <Pressable style={styles.actionButton} onPress={() => handleMoveToServing(item.id)}>
                    <Text style={styles.actionButtonText}>Serve</Text>
                  </Pressable>
                </View>
              ))}
              {waitingItems.length === 0 ? <Text style={styles.emptyText}>No waiting people.</Text> : null}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setWaitingModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </GlassCard>
        </View>
      </Modal>

      <Modal
        transparent
        visible={successfulModalVisible}
        animationType="fade"
        onRequestClose={() => setSuccessfulModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Successful People</Text>
            <ScrollView style={styles.modalList}>
              {successfulItems.map((item, index) => (
                <View key={item.id} style={styles.modalRow}>
                  <Text style={styles.modalName}>{index + 1}. {item.name}</Text>
                  <Text style={styles.successText}>Successful</Text>
                </View>
              ))}
              {successfulItems.length === 0 ? <Text style={styles.emptyText}>No successful records yet.</Text> : null}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setSuccessfulModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </GlassCard>
        </View>
      </Modal>

      <Modal
        transparent
        visible={qrModalVisible}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select QR Code</Text>
            <ScrollView style={styles.modalList}>
              {qrCodes.map((code) => (
                <Pressable
                  key={code.id}
                  style={[styles.qrOption, activeQrId === code.id ? styles.qrOptionActive : null]}
                  onPress={() => {
                    activeQrRef.current = code;
                    setActiveQrId(code.id);
                    setQrModalVisible(false);
                  }}
                >
                  <Text style={styles.modalName}>{code.label}</Text>
                </Pressable>
              ))}
              {qrCodes.length === 0 ? <Text style={styles.emptyText}>No generated QR codes yet.</Text> : null}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setQrModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </GlassCard>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  previewMeta: {
    marginBottom: spacing.sm,
    color: colors.ink500,
    fontSize: 12,
    fontWeight: '600',
  },
  qrHeaderCard: {
    backgroundColor: colors.cardStrong,
    marginBottom: spacing.md,
  },
  qrHeaderLabel: {
    color: colors.ink500,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qrHeaderValue: {
    marginTop: 4,
    color: colors.ink900,
    fontSize: 18,
    fontWeight: '800',
  },
  qrChangeButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.ink700,
  },
  qrChangeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.cardStrong,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.ink500,
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.ink900,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.ink700,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  walkInCard: {
    backgroundColor: colors.cardStrong,
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
  walkInButton: {
    alignSelf: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  walkInButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.cardStrong,
  },
  cardServingTop: {
    backgroundColor: '#E6FAF7',
    borderWidth: 1,
    borderColor: '#7DD3C8',
  },
  servingBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#0F766E',
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  cardMuted: {
    backgroundColor: '#EEFDF8',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  position: {
    width: 34,
    textAlign: 'center',
    fontWeight: '800',
    color: colors.ink700,
  },
  content: {
    flex: 1,
  },
  token: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink900,
  },
  student: {
    color: colors.ink500,
    marginTop: 2,
  },
  qrTagText: {
    marginTop: 3,
    color: colors.ink700,
    fontSize: 12,
    fontWeight: '700',
  },
  servingName: {
    marginTop: 4,
    color: colors.ink900,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  eta: {
    fontWeight: '700',
    color: colors.ink700,
  },
  priority: {
    marginTop: 4,
    fontSize: 12,
    color: colors.ink500,
  },
  priorityHigh: {
    color: colors.warning,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  doneButton: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successText: {
    color: colors.success,
    fontWeight: '700',
    marginTop: 4,
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
    backgroundColor: colors.cardStrong,
  },
  modalTitle: {
    color: colors.ink900,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  modalList: {
    maxHeight: 360,
  },
  modalRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  qrOptionActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  modalName: {
    color: colors.ink700,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  closeButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
  },
  closeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: colors.ink500,
    fontWeight: '600',
    paddingVertical: spacing.md,
  },
});
