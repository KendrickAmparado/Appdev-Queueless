import { StyleSheet, Text, View, Image } from 'react-native';

import { colors, spacing, typography } from '../theme';

export default function ScreenTitle({ title, subtitle, badge, centered = false, logoLeft = false }) {
  return (
    <View style={[styles.wrap, centered ? styles.wrapCentered : null, logoLeft ? styles.wrapWithLogo : null]}>
      {logoLeft ? (
        <Image source={require('../../assets/Qlogo.png')} style={styles.logoLeft} />
      ) : null}
      {badge ? <Text style={[styles.badge, centered ? styles.badgeCentered : null]}>{badge}</Text> : null}
      <Text style={[typography.title, centered ? styles.titleCentered : null]}>{title}</Text>
      {subtitle ? <Text style={[typography.subtitle, styles.subtitle, centered ? styles.subtitleCentered : null]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  wrapCentered: {
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 211, 238, 0.16)',
    color: colors.ink700,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badgeCentered: {
    alignSelf: 'center',
  },
  titleCentered: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 320,
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
