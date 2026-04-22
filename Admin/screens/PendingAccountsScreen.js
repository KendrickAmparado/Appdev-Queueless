import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import {
  approveStaff,
  deleteStaff,
  disableStaff,
  enableStaff,
  updateStaffProfile,
  watchAllStaffProfiles,
} from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function PendingAccountsScreen() {
  const [profiles, setProfiles] = useState([]);
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
    const unsubscribe = watchAllStaffProfiles((nextProfiles) => {
      setProfiles(nextProfiles);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const pendingAccounts = useMemo(
    () => profiles.filter((profile) => profile?.status !== 'approved'),
    [profiles],
  );

  const approvedCount = useMemo(
    () => profiles.filter((profile) => profile?.status === 'approved').length,
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    if (selectedView === 'approved') {
      return profiles.filter((profile) => profile?.status === 'approved' || profile?.status === 'disabled');
    }

    return profiles.filter((profile) => profile?.status !== 'approved');
  }, [profiles, selectedView]);

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
          <Text style={styles.viewButtonLabel}>Total Pending</Text>
          <Text style={styles.viewButtonValue}>{pendingAccounts.length}</Text>
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
          <Text style={styles.viewButtonLabel}>Approved Staff</Text>
          <Text style={styles.viewButtonValue}>{approvedCount}</Text>
        </Pressable>
      </View>

      <Text style={[typography.section, styles.sectionTitle]}>
        {selectedView === 'pending' ? 'QueueLess Pending Staff' : 'QueueLess Registered Staff'}
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
          <Text style={styles.emptyText}>No pending accounts right now.</Text>
        </GlassCard>
      ) : null}

      <FlatList
        data={filteredProfiles}
        keyExtractor={(item) => item.uid}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isDisabled = item.status === 'disabled';
          const isEditing = editingUid === item.uid;
          const isPending = item.status !== 'approved' && item.status !== 'disabled';

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
                    <Text style={styles.itemText}>{item.name || '-'}</Text>
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
                    <Text style={styles.itemText}>{item.contactNumber || '-'}</Text>
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
                    <Text style={styles.itemText}>{item.officeDepartment || '-'}</Text>
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
                    <Text style={styles.itemText}>{item.email || '-'}</Text>
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

                    {isEditing ? (
                      <Pressable style={styles.secondaryButton} onPress={() => handleSaveEdit(item.uid)}>
                        <Text style={styles.secondaryText}>Save</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.secondaryButton} onPress={() => handleEditStart(item)}>
                        <Text style={styles.secondaryText}>Edit</Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={isDisabled ? styles.enableButton : styles.disableButton}
                      onPress={() => (isDisabled ? enableStaff(item.uid) : disableStaff(item.uid))}
                    >
                      <Text style={styles.approveText}>{isDisabled ? 'Enable' : 'Disable'}</Text>
                    </Pressable>

                    <Pressable style={styles.deleteButton} onPress={() => disableStaff(item.uid)}>
                      <Text style={styles.approveText}>Disable</Text>
                    </Pressable>
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
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  },
  approvedViewButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
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
    backgroundColor: '#DDF6F3',
    borderColor: colors.primary,
  },
  hoverApprovedButton: {
    backgroundColor: '#E0F8FA',
    borderColor: colors.sky500,
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
  viewButtonValue: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
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
});
