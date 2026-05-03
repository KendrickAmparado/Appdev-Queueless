import { StyleSheet, Text, View, Image } from 'react-native';

import { colors, spacing, typography } from '../theme';
import WorkspaceHeaderCard from './WorkspaceHeaderCard';

export default function ScreenTitle({ title, subtitle, badge, centered = false, logoLeft = false, compact = false }) {
  const useCompact = compact;
  const workspaceLabel = badge === 'Admin' ? 'Admin' : badge === 'Staff' ? 'Staff' : '';

  return (
    <View style={[styles.wrap, useCompact && styles.wrapCompact, centered ? styles.wrapCentered : null, logoLeft ? styles.wrapWithLogo : null]}>
      <View style={[styles.container, useCompact && styles.containerCompact, centered && styles.containerCentered]}>
        {logoLeft ? (
          <Image source={require('../../assets/Qlogo.png')} style={styles.logoLeft} />
        ) : null}
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              typography.title,
              useCompact && styles.titleCompact,
              workspaceLabel === 'Staff' && styles.titleStaff,
              workspaceLabel === 'Admin' && styles.titleAdmin,
              centered ? styles.titleCentered : null,
            ]}
          >
            {title}
          </Text>
          {workspaceLabel ? <WorkspaceHeaderCard label={workspaceLabel} smallWeather={workspaceLabel === 'Staff'} /> : null}
        </View>
        {subtitle ? <Text style={[typography.subtitle, useCompact && styles.subtitleCompact, styles.subtitle, centered ? styles.subtitleCentered : null]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  wrapCompact: {
    marginBottom: spacing.sm,
  },
  wrapCentered: {
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: spacing.md,
    width: '100%',
  },
  containerCompact: {
    padding: spacing.sm,
    borderRadius: 12,
  },
  containerCentered: {
    alignItems: 'center',
  },
  titleCompact: {
    fontSize: 20,
  },
  titleStaff: {
    fontSize: 20,
    fontWeight: '800',
    maxWidth: '68%',
  },
  titleAdmin: {
    textAlign: 'center',
    flex: 1,
  },
  subtitleCompact: {
    fontSize: 13,
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  titleCentered: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 360,
  },
  subtitleCentered: {
    textAlign: 'center',
    maxWidth: 620,
  },
  logoLeft: {
    width: 48,
    height: 48,
    position: 'absolute',
    left: 0,
    top: -6,
    borderRadius: 999,
  },
  wrapWithLogo: {
    paddingLeft: 64,
    minHeight: 48,
    justifyContent: 'center',
  },
});
