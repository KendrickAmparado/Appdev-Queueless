import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import {
  archiveStaff,
  approveStaff,
  deleteStaffPermanently,
  disableStaff,
  enableStaff,
  restoreStaff,
  updateStaffProfile,
  watchAllArchivedStaffProfiles,
  watchAllStaffProfiles,
} from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

function hasVisiblePendingDetails(profile) {
  const name = (profile?.name || '').trim();
  const contact = (profile?.contactNumber || '').trim();
  const office = (profile?.officeDepartment || '').trim();
  const email = (profile?.email || '').trim();
  return Boolean(name || contact || office || email);
}

export default function PendingAccountsScreen() {
  const [activeProfiles, setActiveProfiles] = useState([]);
  const [archivedProfiles, setArchivedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('pending');
  const [approvingUid, setApprovingUid] = useState('');
  const [editingUid, setEditingUid] = useState('');
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editOffice, setEditOffice] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmailEditable, setEditEmailEditable] = useState(true);

  useEffect(() => {
    const unsubscribeActive = watchAllStaffProfiles((nextProfiles) => {
      setActiveProfiles(nextProfiles);
      setLoading(false);
    });

    const unsubscribeArchived = watchAllArchivedStaffProfiles((nextProfiles) => {
      setArchivedProfiles(nextProfiles);
    });

    return () => {
      unsubscribeActive();
      unsubscribeArchived();
    };
  }, []);

  const pendingAccounts = useMemo(
    () =>
      activeProfiles.filter(
        (profile) => profile?.status !== 'approved' && profile?.archived !== true && hasVisiblePendingDetails(profile),
      ),
    [activeProfiles],
  );

  const approvedCount = useMemo(
    () => activeProfiles.filter((profile) => profile?.archived !== true && profile?.status === 'approved').length,
    [activeProfiles],
  );

  const archivedRecords = useMemo(() => {
    const flaggedArchived = activeProfiles.filter((profile) => profile?.archived === true);
    const merged = [...archivedProfiles, ...flaggedArchived];
    const deduped = new Map();
    merged.forEach((item) => {
      if (item?.uid) deduped.set(item.uid, item);
    });
    return Array.from(deduped.values());
  }, [activeProfiles, archivedProfiles]);

  const archivedCount = useMemo(() => archivedRecords.length, [archivedRecords]);

  const filteredProfiles = useMemo(() => {
    if (selectedView === 'approved') {
      return activeProfiles.filter(
        (profile) => profile?.archived !== true && (profile?.status === 'approved' || profile?.status === 'disabled'),
      );
    }

    if (selectedView === 'archived') {
      return archivedRecords;
    }

    return activeProfiles.filter(
      (profile) => profile?.status !== 'approved' && profile?.archived !== true && hasVisiblePendingDetails(profile),
    );
  }, [activeProfiles, archivedRecords, selectedView]);

  const handleApprove = async (uid) => {
    try {
      setApprovingUid(uid);
      await approveStaff(uid);
    } finally {
      setApprovingUid('');
    }
  };

  const handleEditStart = (item) => {
    setEditingUid(item.uid);
    setEditName(item.name || '');
    setEditContact(item.contactNumber || '');
    setEditOffice(item.officeDepartment || '');
    setEditEmail(item.email || '');
    setEditEmailEditable(item?.status !== 'approved');
  };

  const handleSaveEdit = async (uid) => {
    const payload = {
      name: editName.trim(),
      contactNumber: editContact.trim(),
      officeDepartment: editOffice.trim(),
    };

    if (editEmailEditable) {
      payload.email = editEmail.trim().toLowerCase();
    }

    await updateStaffProfile(uid, payload);
    setEditingUid('');
    setEditName('');
    setEditContact('');
    setEditOffice('');
    setEditEmail('');
  };

  const handleDelete = (item) => {
    const uid = item?.uid;
    if (!uid) return;

    const accountName = item?.name || item?.email || 'this staff account';
    const message = `Are you sure you want to archive ${accountName}? This account will be hidden from pending and approved lists.`;

    const executeArchive = async () => {
      try {
        await archiveStaff(uid);
      } catch (error) {
        const reason = error?.message || 'Unable to archive this staff account right now.';
        Alert.alert('Archive failed', reason);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : true;
      if (confirmed) {
        void executeArchive();
      }
      return;
    }

    Alert.alert('Archive staff account?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          void executeArchive();
        },
      },
    ]);
  };

  const handleRestore = (item) => {
    const uid = item?.uid;
    if (!uid) return;

    const accountName = item?.name || item?.email || 'this staff account';
    const message = `Restore ${accountName} to pending accounts?`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void restoreStaff(uid);
      }
      return;
    }

    Alert.alert('Restore staff account?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: () => {
          void restoreStaff(uid);
        },
      },
    ]);
  };

  const handlePermanentDelete = (item) => {
    const uid = item?.uid;
    if (!uid) return;

    const accountName = item?.name || item?.email || 'this staff account';
    const message = `Delete ${accountName} permanently? This action cannot be undone.`;

    const executePermanentDelete = async () => {
      try {
        await deleteStaffPermanently(uid);
      } catch (error) {
        const reason = error?.message || 'Unable to permanently delete this staff account right now.';
        Alert.alert('Delete failed', reason);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void executePermanentDelete();
      }
      return;
    }

    Alert.alert('Delete permanently?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void executePermanentDelete();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Pending"
        title="Pending Staff Accounts"
        subtitle="Review and approve pending staff accounts to allow them to generate QR codes and manage queues."
        centered
      />

      <View style={styles.pillRow}>
        <Pressable
          onPress={() => setSelectedView('pending')}
          style={({ hovered, pressed }) => [
            styles.viewButton,
            styles.pendingViewButton,
            selectedView === 'pending' ? styles.activeViewButton : null,
            hovered ? styles.hoverPendingButton : null,
            pressed ? styles.pressedViewButton : null,
          ]}
        >
          <Text style={[styles.viewButtonLabel, styles.pendingViewButtonLabel]}>Total Pending</Text>
          <Text style={[styles.viewButtonValue, styles.pendingViewButtonValue]}>{pendingAccounts.length}</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedView('approved')}
          style={({ hovered, pressed }) => [
            styles.viewButton,
            styles.approvedViewButton,
            selectedView === 'approved' ? styles.activeViewButton : null,
            hovered ? styles.hoverApprovedButton : null,
            pressed ? styles.pressedViewButton : null,
          ]}
        >
          <Text style={[styles.viewButtonLabel, styles.approvedViewButtonLabel]}>Approved Staff</Text>
          <Text style={[styles.viewButtonValue, styles.approvedViewButtonValue]}>{approvedCount}</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedView('archived')}
          style={({ hovered, pressed }) => [
            styles.viewButton,
            styles.archivedViewButton,
            selectedView === 'archived' ? styles.activeViewButton : null,
            hovered ? styles.hoverArchivedButton : null,
            pressed ? styles.pressedViewButton : null,
          ]}
        >
          <Text style={[styles.viewButtonLabel, styles.archivedViewButtonLabel]}>Archived Staff</Text>
          <Text style={[styles.viewButtonValue, styles.archivedViewButtonValue]}>{archivedCount}</Text>
        </Pressable>
      </View>

      <Text style={[typography.section, styles.sectionTitle]}>
        {selectedView === 'pending'
          ? 'QueueLess Pending Staff'
          : selectedView === 'approved'
            ? 'QueueLess Registered Staff'
            : 'QueueLess Archived Staff'}
      </Text>

      <GlassCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCol, styles.colAvatar]}>Photo</Text>
          <Text style={[styles.headerCol, styles.colName]}>Name</Text>
          <Text style={[styles.headerCol, styles.colContact]}>Contact</Text>
          <Text style={[styles.headerCol, styles.colOffice]}>Office</Text>
          <Text style={[styles.headerCol, styles.colEmail]}>Email</Text>
          <Text style={[styles.headerCol, styles.colAction]}>Action</Text>
        </View>
      </GlassCard>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {!loading && filteredProfiles.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {selectedView === 'archived' ? 'No archived accounts right now.' : 'No pending accounts right now.'}
          </Text>
        </GlassCard>
      ) : null}

      <FlatList
        data={filteredProfiles}
        keyExtractor={(item) => item.uid}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isDisabled = item.status === 'disabled';
          const isArchived = selectedView === 'archived' || item?.archived === true;
          const isEditing = editingUid === item.uid;
          const isPending = item.status !== 'approved' && item.status !== 'disabled' && !isArchived;

          return (
            <GlassCard style={styles.itemCard}>
              <View style={styles.itemRowColumns}>
                <View style={styles.colAvatar}>
                  <Image
                    source={item.avatarUri ? { uri: item.avatarUri } : require('../../assets/icon.png')}
                    style={styles.avatar}
                  />
                </View>
                <View style={styles.colName}>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Staff name"
                      placeholderTextColor={colors.ink500}
                    />
                  ) : (
                    <Text style={styles.itemText}>{item.name || ''}</Text>
                  )}
                </View>
                <View style={styles.colContact}>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editContact}
                      onChangeText={setEditContact}
                      placeholder="Contact"
                      placeholderTextColor={colors.ink500}
                    />
                  ) : (
                    <Text style={styles.itemText}>{item.contactNumber || ''}</Text>
                  )}
                </View>
                <View style={styles.colOffice}>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editOffice}
                      onChangeText={setEditOffice}
                      placeholder="Office"
                      placeholderTextColor={colors.ink500}
                    />
                  ) : (
                    <Text style={styles.itemText}>{item.officeDepartment || ''}</Text>
                  )}
                </View>
                <View style={styles.colEmail}>
                  {isEditing ? (
                    <TextInput
                      style={[styles.input, !editEmailEditable ? styles.inputDisabled : null]}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="Email"
                      placeholderTextColor={colors.ink500}
                      autoCapitalize="none"
                      editable={editEmailEditable}
                    />
                  ) : (
                    <Text style={styles.itemText}>{item.email || ''}</Text>
                  )}
                </View>
                <View style={styles.colAction}>
                  <View style={styles.actionRow}>
                    {isPending ? (
                      <Pressable
                        style={styles.approveButton}
                        onPress={() => handleApprove(item.uid)}
                        disabled={approvingUid === item.uid}
                      >
                        <Text style={styles.approveText}>{approvingUid === item.uid ? '...' : 'Approve'}</Text>
                      </Pressable>
                    ) : null}

                    {isArchived || isPending ? null : isEditing ? (
                      <Pressable style={styles.secondaryButton} onPress={() => handleSaveEdit(item.uid)}>
                        <Text style={styles.secondaryText}>Save</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.secondaryButton} onPress={() => handleEditStart(item)}>
                        <Text style={styles.secondaryText}>Edit</Text>
                      </Pressable>
                    )}

                    {isArchived ? (
                      <>
                        <Pressable style={styles.enableButton} onPress={() => handleRestore(item)}>
                          <Text style={styles.approveText}>Restore</Text>
                        </Pressable>
                        <Pressable style={styles.permanentDeleteButton} onPress={() => handlePermanentDelete(item)}>
                          <Text style={styles.approveText}>Delete Permanently</Text>
                        </Pressable>
                      </>
                    ) : isPending ? null : (
                      <Pressable
                        style={isDisabled ? styles.enableButton : styles.disableButton}
                        onPress={() => (isDisabled ? enableStaff(item.uid) : disableStaff(item.uid))}
                      >
                        <Text style={styles.approveText}>{isDisabled ? 'Enable' : 'Disable'}</Text>
                      </Pressable>
                    )}

                    {isArchived ? null : (
                      <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
                        <Text style={styles.approveText}>Archive</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

            </GlassCard>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  viewButton: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
  },
  pendingViewButton: {
    backgroundColor: '#FFF4D9',
    borderColor: '#F2D48C',
  },
  approvedViewButton: {
    backgroundColor: '#E2F8EA',
    borderColor: '#9FD9B2',
  },
  archivedViewButton: {
    backgroundColor: '#FCE7EB',
    borderColor: '#F4AFBC',
  },
  activeViewButton: {
    shadowColor: colors.ink900,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
    transform: [{ translateY: -1 }],
  },
  hoverPendingButton: {
    backgroundColor: '#FFECC0',
    borderColor: '#D0A94B',
  },
  hoverApprovedButton: {
    backgroundColor: '#D3F2E0',
    borderColor: '#63B87E',
  },
  hoverArchivedButton: {
    backgroundColor: '#F8D7DE',
    borderColor: '#CF657C',
  },
  pressedViewButton: {
    transform: [{ translateY: 0 }],
    opacity: 0.95,
  },
  viewButtonLabel: {
    color: colors.ink700,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingViewButtonLabel: {
    color: '#7A5416',
  },
  approvedViewButtonLabel: {
    color: '#1E6C3E',
  },
  archivedViewButtonLabel: {
    color: '#8D2F42',
  },
  viewButtonValue: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  pendingViewButtonValue: {
    color: '#B0741D',
  },
  approvedViewButtonValue: {
    color: '#1F8A4B',
  },
  archivedViewButtonValue: {
    color: '#C2445F',
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  listContent: {
    gap: spacing.sm,
  },
  headerCard: {
    backgroundColor: colors.cardStrong,
    marginBottom: spacing.sm,
    borderColor: 'rgba(11, 95, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerCol: {
    fontSize: 11,
    color: colors.ink500,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  colAvatar: {
    width: 56,
  },
  colName: {
    flex: 1.2,
  },
  colContact: {
    flex: 1,
  },
  colOffice: {
    flex: 1,
  },
  colEmail: {
    flex: 1.5,
  },
  colAction: {
    flex: 1.4,
  },
  loadingWrap: {
    paddingVertical: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.cardStrong,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.ink700,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: colors.cardStrong,
    borderColor: 'rgba(11, 95, 255, 0.13)',
  },
  itemRowColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D9E6FF',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.ink900,
    backgroundColor: '#FAFCFF',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: colors.ink500,
  },
  itemText: {
    color: colors.ink800,
    fontSize: 12,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: colors.primary,
    minHeight: 34,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0A3FC4',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 5,
  },
  approveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  secondaryButton: {
    backgroundColor: colors.ink700,
    minHeight: 34,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  secondaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  disableButton: {
    backgroundColor: colors.warning,
    minHeight: 34,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  enableButton: {
    backgroundColor: colors.success,
    minHeight: 34,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  deleteButton: {
    backgroundColor: colors.danger,
    minHeight: 34,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  permanentDeleteButton: {
    backgroundColor: '#8B1111',
    minHeight: 34,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.22)',
  },
});
