import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FontAwesome5 } from '@expo/vector-icons';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { watchAllStaffProfiles, watchAllStaffQrCodes } from '../../firebase';
import { colors, spacing, typography } from '../../src/theme';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsv(value) {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function formatPdfCell(value, length) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length >= length) {
    return `${normalized.slice(0, Math.max(0, length - 3))}...`;
  }
  return normalized.padEnd(length, ' ');
}

function buildApprovedAccountsPdf(rows) {
  const pageWidth = 842;
  const pageHeight = 595;
  const startX = 36;
  const startY = 560;
  const lineHeight = 14;
  const maxLinesPerPage = 34;

  const header = [
    formatPdfCell('#', 4),
    formatPdfCell('Name', 24),
    formatPdfCell('Email', 34),
    formatPdfCell('Contact', 18),
    formatPdfCell('Office', 24),
    formatPdfCell('Status', 10),
  ].join(' ');

  const separator = '-'.repeat(header.length);

  const bodyLines = rows.map((row) =>
    [
      formatPdfCell(row.no, 4),
      formatPdfCell(row.name || '-', 24),
      formatPdfCell(row.email || '-', 34),
      formatPdfCell(row.contactNumber || '-', 18),
      formatPdfCell(row.officeDepartment || '-', 24),
      formatPdfCell(row.status || '-', 10),
    ].join(' '),
  );

  const allLines = [header, separator, ...bodyLines];
  const pages = [];
  for (let i = 0; i < allLines.length; i += maxLinesPerPage) {
    pages.push(allLines.slice(i, i + maxLinesPerPage));
  }

  const objects = [];
  const pageObjectNumbers = [];
  const contentObjectNumbers = [];
  const fontObjectNumber = 3 + pages.length * 2;

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  for (let index = 0; index < pages.length; index += 1) {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    contentObjectNumbers.push(contentObjectNumber);
  }

  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
  );

  pages.forEach((lines, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];
    const contentLines = [
      'BT',
      '/F1 9 Tf',
      `${startX} ${startY} Td`,
    ];

    lines.forEach((line, lineIndex) => {
      const command = `(${escapePdfText(line)}) Tj`;
      contentLines.push(lineIndex === 0 ? command : `0 -${lineHeight} Td ${command}`);
    });

    contentLines.push('ET');
    const stream = `${contentLines.join('\n')}\n`;

    objects.push(
      `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObjectNumber} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    );
  });

  objects.push(`${fontObjectNumber} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

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

  const approvedProfiles = useMemo(
    () => profiles.filter((profile) => profile?.status === 'approved'),
    [profiles],
  );

  const pending = useMemo(
    () => profiles.filter((profile) => profile?.status !== 'approved' && profile?.archived !== true).length,
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

  const exportRows = useMemo(
    () =>
      approvedProfiles.map((profile, index) => ({
        no: index + 1,
        name: profile?.name || '',
        email: profile?.email || '',
        contactNumber: profile?.contactNumber || '',
        officeDepartment: profile?.officeDepartment || '',
        status: profile?.status || '',
      })),
    [approvedProfiles],
  );

  const handleExportPdf = async () => {
    if (exportRows.length === 0) {
      Alert.alert('No approved records', 'There are no approved staff accounts to export.');
      return;
    }

    const rowsHtml = exportRows
      .map(
        (row) => `
          <tr>
            <td>${row.no}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.email)}</td>
            <td>${escapeHtml(row.contactNumber)}</td>
            <td>${escapeHtml(row.officeDepartment)}</td>
            <td>${escapeHtml(row.status)}</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #0F172A; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #D1D5DB; padding: 8px; text-align: left; }
            th { background: #DCEFEB; color: #134E4A; }
          </style>
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
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const pdfContent = buildApprovedAccountsPdf(exportRows);
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `approved-staff-${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Export failed', error?.message || 'Unable to export PDF right now.');
    }
  };

  const handleExportExcel = async () => {
    if (exportRows.length === 0) {
      Alert.alert('No approved records', 'There are no approved staff accounts to export.');
      return;
    }

    const csvLines = [
      ['No', 'Name', 'Email', 'Contact Number', 'Office Department', 'Status']
        .map(escapeCsv)
        .join(','),
      ...exportRows.map((row) =>
        [row.no, row.name, row.email, row.contactNumber, row.officeDepartment, row.status]
          .map(escapeCsv)
          .join(','),
      ),
    ];

    const csv = csvLines.join('\n');
    const fileName = `approved-staff-${Date.now()}.csv`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export approved staff accounts',
      });
    } catch (error) {
      Alert.alert('Export failed', error?.message || 'Unable to export Excel file right now.');
    }
  };

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Admin"
        title="Reports"
        subtitle="Operational summary for approvals, staffing distribution, and QR code utilization."
        centered
      />

      <GlassCard style={styles.exportCard}>
        <View style={styles.exportHeader}>
          <View style={styles.exportCopy}>
            <Text style={[typography.section, styles.exportTitle]}>Approved Account Records</Text>
            <Text style={styles.exportSubtitle}>
              Download approved staff accounts as a PDF report or an Excel-compatible file.
            </Text>
          </View>
          <View style={styles.exportBadge}>
            <Text style={styles.exportBadgeText}>{approvedProfiles.length} records</Text>
          </View>
        </View>

        <View style={styles.exportActions}>
          <Pressable style={styles.exportButtonPrimary} onPress={handleExportPdf}>
            <FontAwesome5 name="file-pdf" size={14} color="#FFFFFF" solid />
            <Text style={styles.exportButtonPrimaryText}>Download PDF</Text>
          </Pressable>
          <Pressable style={styles.exportButtonSecondary} onPress={handleExportExcel}>
            <FontAwesome5 name="file-excel" size={14} color={colors.primaryDark} solid />
            <Text style={styles.exportButtonSecondaryText}>Download Excel</Text>
          </Pressable>
        </View>
      </GlassCard>

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

      <GlassCard style={styles.tableCard}>
        <Text style={[typography.section, styles.summaryTitle]}>Approved Accounts Table</Text>
        <Text style={styles.tableSubtitle}>
          This is the exact approved-accounts record set used for the PDF and Excel downloads.
        </Text>

        <View style={styles.sheetWrap}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeadText, styles.tableCellBase, styles.colNo]}>#</Text>
            <Text style={[styles.tableHeadText, styles.tableCellBase, styles.colName]}>Name</Text>
            <Text style={[styles.tableHeadText, styles.tableCellBase, styles.colEmail]}>Email</Text>
            <Text style={[styles.tableHeadText, styles.tableCellBase, styles.colContact]}>Contact</Text>
            <Text style={[styles.tableHeadText, styles.tableCellBase, styles.colOffice]}>Office</Text>
          </View>

          {exportRows.length === 0 ? (
            <Text style={styles.emptyTableText}>No approved accounts available yet.</Text>
          ) : (
            exportRows.map((row, index) => (
              <View
                key={`${row.email}-${row.no}`}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}
              >
                <Text style={[styles.tableCellText, styles.tableCellBase, styles.colNo]}>{row.no}</Text>
                <Text style={[styles.tableCellText, styles.tableCellBase, styles.colName]} numberOfLines={2}>{row.name || '-'}</Text>
                <Text style={[styles.tableCellText, styles.tableCellBase, styles.colEmail]} numberOfLines={2}>{row.email || '-'}</Text>
                <Text style={[styles.tableCellText, styles.tableCellBase, styles.colContact]} numberOfLines={2}>{row.contactNumber || '-'}</Text>
                <Text style={[styles.tableCellText, styles.tableCellBase, styles.colOffice]} numberOfLines={2}>{row.officeDepartment || '-'}</Text>
              </View>
            ))
          )}
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  exportCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
    borderColor: colors.borderStrong,
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  exportCopy: {
    flex: 1,
  },
  exportTitle: {
    marginBottom: 6,
  },
  exportSubtitle: {
    color: colors.ink600,
    lineHeight: 20,
  },
  exportBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  exportBadgeText: {
    color: '#9A6700',
    fontSize: 12,
    fontWeight: '800',
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  exportButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  exportButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exportButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  exportButtonSecondaryText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
    borderColor: colors.borderStrong,
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(245, 158, 11, 0.18)',
    marginBottom: spacing.md,
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
  tableCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: colors.borderStrong,
  },
  tableSubtitle: {
    color: colors.ink600,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  sheetWrap: {
    borderWidth: 1,
    borderColor: '#D5D9E2',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1EE',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableHeadText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tableCellBase: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D5D9E2',
  },
  tableCellText: {
    color: colors.ink700,
    fontSize: 12,
    lineHeight: 18,
  },
  colNo: {
    width: '8%',
  },
  colName: {
    width: '22%',
  },
  colEmail: {
    width: '28%',
  },
  colContact: {
    width: '20%',
  },
  colOffice: {
    width: '22%',
  },
  emptyTableText: {
    color: colors.ink500,
    fontWeight: '600',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
