import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { buildQueueJoinLink, watchAllStaffProfiles, watchAllStaffQrCodes } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function StaffQrCodesScreen() {
  const [codes, setCodes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const unsubscribeCodes = watchAllStaffQrCodes((list) => {
      setCodes(list);
    });
    const unsubscribeProfiles = watchAllStaffProfiles((list) => {
      setProfiles(list);
    });

    return () => {
      unsubscribeCodes();
      unsubscribeProfiles();
    };
  }, []);

  const profileMap = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.uid] = profile;
      return acc;
    }, {});
  }, [profiles]);

  const totalScans = useMemo(
    () => codes.reduce((acc, item) => acc + Number(item?.scans || 0), 0),
    [codes],
  );

  const activeStaffWithQr = useMemo(() => {
    const uidSet = new Set(codes.map((item) => item.uid));
    return uidSet.size;
  }, [codes]);

  const numColumns = width >= 1500 ? 5 : width >= 1200 ? 4 : width >= 860 ? 3 : 2;

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Admin"
        title="Staff QR Codes"
        subtitle="Monitor generated codes, ownership, and scan activity across all offices."
        centered
      />

      <View style={styles.kpiRow}>
        <GlassCard style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total QR Codes</Text>
          <Text style={styles.kpiValue}>{codes.length}</Text>
        </GlassCard>
        <GlassCard style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Active Staff w/ QR</Text>
          <Text style={styles.kpiValue}>{activeStaffWithQr}</Text>
        </GlassCard>
        <GlassCard style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Scans</Text>
          <Text style={styles.kpiValue}>{totalScans}</Text>
        </GlassCard>
      </View>

      <Text style={[typography.section, styles.sectionTitle]}>All Office QR Codes</Text>

      <FlatList
        data={codes}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        key={numColumns}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => {
          const owner = profileMap[item.uid];
          return (
            <GlassCard style={styles.card}>
              <View style={styles.qrWrap}>
                <QRCode value={item.value} size={88} />
              </View>
              <Text style={styles.id}>{item.label}</Text>
              <Text style={styles.meta}>{owner?.officeDepartment || 'Office TBD'}</Text>
              <Text style={styles.metaSmall}>{owner?.name || 'Unknown staff'}</Text>
              <Text style={styles.metaScans}>Scans: {item?.scans || 0}</Text>
              <Text style={styles.linkText}>{item.value || buildQueueJoinLink(item.uid, item.id, item.label)}</Text>
            </GlassCard>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  kpiLabel: {
    color: colors.ink500,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    marginTop: 4,
    color: colors.ink900,
    fontSize: 24,
    fontWeight: '800',
  },
  grid: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: 170,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    borderColor: colors.border,
  },
  qrWrap: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  id: {
    textAlign: 'center',
    color: colors.ink900,
    fontWeight: '800',
    fontSize: 12,
  },
  meta: {
    marginTop: 2,
    textAlign: 'center',
    color: colors.ink500,
    fontSize: 10,
  },
  metaSmall: {
    color: colors.ink500,
    fontSize: 10,
    textAlign: 'center',
  },
  metaScans: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  linkText: {
    marginTop: 4,
    color: colors.ink500,
    fontSize: 9,
    textAlign: 'center',
  },
});
