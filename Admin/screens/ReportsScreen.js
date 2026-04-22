import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { watchAllStaffProfiles, watchAllStaffQrCodes } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

export default function ReportsScreen() {
  const [profiles, setProfiles] = useState([]);
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    const unsubscribeProfiles = watchAllStaffProfiles((list) => {
      setProfiles(list);
    });

    const unsubscribeCodes = watchAllStaffQrCodes((list) => {
      setCodes(list);
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeCodes();
    };
  }, []);

  const approved = useMemo(
    () => profiles.filter((profile) => profile?.status === 'approved').length,
    [profiles],
  );

  const pending = useMemo(
    () => profiles.filter((profile) => profile?.status !== 'approved').length,
    [profiles],
  );

  const approvalRate = useMemo(() => {
    if (profiles.length === 0) return 0;
    return Math.round((approved / profiles.length) * 100);
  }, [approved, profiles.length]);

  const totalScans = useMemo(
    () => codes.reduce((acc, item) => acc + Number(item?.scans || 0), 0),
    [codes],
  );

  const averageScans = useMemo(() => {
    if (codes.length === 0) return 0;
    return Math.round(totalScans / codes.length);
  }, [codes.length, totalScans]);

  const topOffice = useMemo(() => {
    const officeMap = profiles.reduce((acc, profile) => {
      const office = profile?.officeDepartment?.trim() || 'Unassigned';
      acc[office] = (acc[office] || 0) + 1;
      return acc;
    }, {});

    const top = Object.entries(officeMap).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], count: top[1] } : { name: 'N/A', count: 0 };
  }, [profiles]);

  const insightItems = useMemo(() => {
    const insights = [];

    if (approvalRate < 70) {
      insights.push('Approval throughput is below target. Prioritize pending account validation this week.');
    } else {
      insights.push('Approval throughput is healthy and on track for stable operations.');
    }

    if (averageScans >= 15) {
      insights.push('QR utilization is high. Consider adding queue staff during peak hours.');
    } else {
      insights.push('QR utilization is moderate. Promote QR onboarding for faster student entry.');
    }

    insights.push(`Top staffed office is ${topOffice.name} with ${topOffice.count} active staff profiles.`);
    return insights;
  }, [approvalRate, averageScans, topOffice.count, topOffice.name]);
  async function exportAllStaffPdf() {
    const staffList = profiles || [];
    if (!staffList.length) return;

    const rowsHtml = staffList
      .map(
        (p, i) =>
          `<tr><td style="padding:6px;border:1px solid #ddd">${i + 1}</td><td style="padding:6px;border:1px solid #ddd">${(p.name || '').replace(/</g, '&lt;')}</td><td style="padding:6px;border:1px solid #ddd">${(p.email || '').replace(/</g, '&lt;')}</td><td style="padding:6px;border:1px solid #ddd">${(p.contactNumber || '').replace(/</g, '&lt;')}</td><td style="padding:6px;border:1px solid #ddd">${(p.officeDepartment || '').replace(/</g, '&lt;')}</td><td style="padding:6px;border:1px solid #ddd">${(p.status || '').replace(/</g, '&lt;')}</td></tr>`,
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>table{border-collapse:collapse; width:100%; font-family: Arial, Helvetica, sans-serif; font-size:12px;} th, td{padding:6px;border:1px solid #ddd; text-align:left;} th{background:#f3f4f6;}</style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Office</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        // Use printAsync on web to open the PDF/print dialog
        await Print.printAsync({ html });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `all-staff-${Date.now()}.pdf`;
      const dest = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf' });
    } catch (e) {
      // ignore errors for now
    }
  }

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Admin"
        title="Reports"
        subtitle="Operational summary for approvals, staffing distribution, and QR code utilization."
        centered
      />

      {/* Export All Staff button removed per request */}

      <View style={styles.metricsRow}>
        <GlassCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Approval Rate</Text>
          <Text style={styles.metricValue}>{approvalRate}%</Text>
        </GlassCard>
        <GlassCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending Accounts</Text>
          <Text style={styles.metricValue}>{pending}</Text>
        </GlassCard>
        <GlassCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Average Scans / QR</Text>
          <Text style={styles.metricValue}>{averageScans}</Text>
        </GlassCard>
      </View>

      <GlassCard style={styles.summaryCard}>
        <Text style={[typography.section, styles.summaryTitle]}>Report Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Staff Profiles</Text>
            <Text style={styles.summaryValue}>{profiles.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Approved Staff</Text>
            <Text style={styles.summaryValue}>{approved}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total QR Generated</Text>
            <Text style={styles.summaryValue}>{codes.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Top Office</Text>
            <Text style={styles.summaryValue}>{topOffice.name}</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.insightsCard}>
        <Text style={[typography.section, styles.summaryTitle]}>Recommended Actions</Text>
        {insightItems.map((insight) => (
          <View key={insight} style={styles.insightRow}>
            <View style={styles.dot} />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardStrong,
  },
  metricLabel: {
    color: colors.ink500,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    marginTop: 4,
    color: colors.ink900,
    fontSize: 26,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: colors.cardStrong,
    marginBottom: spacing.md,
    borderColor: 'rgba(11, 95, 255, 0.22)',
  },
  summaryTitle: {
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryItem: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FAFCFF',
  },
  summaryLabel: {
    color: colors.ink500,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 4,
    color: colors.ink900,
    fontSize: 17,
    fontWeight: '800',
  },
  insightsCard: {
    backgroundColor: colors.cardStrong,
    borderColor: 'rgba(255, 122, 26, 0.2)',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
    marginTop: 7,
    marginRight: 8,
  },
  insightText: {
    flex: 1,
    color: colors.ink700,
    lineHeight: 21,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '700',
  },
});
