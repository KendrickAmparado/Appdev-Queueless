import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import StatPill from '../../src/components/StatPill';
import { watchAllStaffProfiles } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function AdminOverviewScreen() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const unsubscribe = watchAllStaffProfiles((nextProfiles) => {
      setProfiles(nextProfiles);
    });

    return unsubscribe;
  }, []);

  const pendingCount = useMemo(
    () => profiles.filter((profile) => profile?.status !== 'approved' && profile?.archived !== true).length,
    [profiles],
  );

  const approvedCount = useMemo(
    () => profiles.filter((profile) => profile?.status === 'approved').length,
    [profiles],
  );

  const disabledCount = useMemo(
    () => profiles.filter((profile) => profile?.status === 'disabled').length,
    [profiles],
  );

  const topOffices = useMemo(() => {
    const officeTotals = profiles.reduce((acc, profile) => {
      const office = profile?.officeDepartment?.trim() || 'Unassigned Office';
      acc[office] = (acc[office] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(officeTotals)
      .map(([office, total]) => ({ office, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [profiles]);

  const healthLabel = useMemo(() => {
    if (profiles.length === 0) return 'No Staff Yet';

    const approvalRate = Math.round((approvedCount / profiles.length) * 100);
    if (approvalRate >= 80) return 'Healthy Flow';
    if (approvalRate >= 50) return 'Moderate Load';
    return 'Needs Attention';
  }, [approvedCount, profiles.length]);

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="QueueLess"
        title="Admin Overview"
        subtitle="Track staffing readiness, pending approvals, and office distribution from one dashboard."
        centered
      />

      <View style={styles.grid}>
        <StatPill label="Pending Accounts" value={pendingCount} icon="user-clock" tone="warning" />
        <StatPill label="Approved Staff" value={approvedCount} icon="user-check" tone="success" />
      </View>

      <View style={[styles.grid, styles.gridBottom]}>
        <StatPill label="Total Staff" value={profiles.length} icon="users" />
        <StatPill label="Disabled" value={disabledCount} icon="user-slash" tone="danger" />
      </View>

      <GlassCard style={styles.healthCard}>
        <Text style={styles.healthBadge}>{healthLabel}</Text>
        <Text style={styles.healthTitle}>Approval Performance</Text>
        <Text style={styles.healthText}>
          {profiles.length === 0
            ? 'No staff records yet. Invite staff accounts to begin onboarding.'
            : `${Math.round((approvedCount / profiles.length) * 100)}% of staff are approved and ready to serve students.`}
        </Text>
      </GlassCard>

      <GlassCard style={styles.officeCard}>
        <Text style={[typography.section, styles.alertTitle]}>Top Offices By Staff Count</Text>
        {topOffices.length === 0 ? (
          <Text style={styles.alertText}>No office records available yet.</Text>
        ) : (
          topOffices.map((item, index) => (
            <View key={item.office} style={styles.officeRow}>
              <Text style={styles.officeRank}>#{index + 1}</Text>
              <Text style={styles.officeName}>{item.office}</Text>
              <Text style={styles.officeCount}>{item.total}</Text>
            </View>
          ))
        )}
      </GlassCard>

      <GlassCard style={styles.alertCard}>
        <Text style={[typography.section, styles.alertTitle]}>Office Status</Text>
        <Text style={styles.alertText}>
          Recommended action: prioritize approving pending users assigned to busy offices so queue handling stays balanced.
        </Text>
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridBottom: {
    marginTop: 10,
    marginBottom: spacing.md,
  },
  healthCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
    borderColor: colors.borderStrong,
  },
  healthBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthTitle: {
    color: colors.ink900,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  healthText: {
    color: colors.ink700,
    lineHeight: 21,
  },
  officeCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  officeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  officeRank: {
    width: 38,
    color: colors.primary,
    fontWeight: '800',
  },
  officeName: {
    flex: 1,
    color: colors.ink800,
    fontWeight: '700',
  },
  officeCount: {
    color: colors.ink900,
    fontWeight: '800',
  },
  alertCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertTitle: {
    marginBottom: 8,
  },
  alertText: {
    color: colors.ink700,
    lineHeight: 22,
  },
});
