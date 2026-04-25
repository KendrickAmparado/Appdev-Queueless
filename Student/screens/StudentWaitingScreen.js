import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import GlassCard from '../../src/components/GlassCard';
import ScreenContainer from '../../src/components/ScreenContainer';
import ScreenTitle from '../../src/components/ScreenTitle';
import { watchStudentQueueTicket } from '../../firebase';
import { colors, spacing } from '../../src/theme';

function WaitingOrb() {
  const spinValue = useState(() => new Animated.Value(0))[0];
  const pulseValue = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0.96,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    spinLoop.start();
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseValue, spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loaderWrap}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseValue }] }]} />
      <Animated.View style={[styles.spinnerRing, { transform: [{ rotate }] }]}>
        <View style={styles.spinnerDot} />
      </Animated.View>
      <View style={styles.loaderCore} />
    </View>
  );
}

export default function StudentWaitingScreen({ navigation, route }) {
  const { uid, queueId, studentName, qrLabel } = route.params || {};
  const [ticket, setTicket] = useState({
    exists: true,
    status: 'waiting',
    position: null,
    waitingCount: 0,
  });

  useEffect(() => {
    const unsubscribe = watchStudentQueueTicket(uid, queueId, (nextTicket) => {
      setTicket(nextTicket);
    });

    return unsubscribe;
  }, [uid, queueId]);

  const statusCopy = useMemo(() => {
    if (!ticket.exists || ticket.status === 'not_found') {
      return {
        title: 'Queue Ticket Not Found',
        subtitle: 'Your ticket may have been removed. Please join again.',
        tone: styles.notFound,
      };
    }

    if (ticket.status === 'serving') {
      return {
        title: 'Your Turn',
        subtitle: 'Please proceed now.',
        tone: styles.serving,
      };
    }

    if (ticket.status === 'successful') {
      return {
        title: 'Completed',
        subtitle: 'Your queue transaction is marked successful.',
        tone: styles.done,
      };
    }

    return {
      title: 'Waiting In Queue',
      subtitle: 'Please stay nearby while waiting for your turn.',
      tone: styles.waiting,
    };
  }, [ticket.exists, ticket.status]);

  return (
    <ScreenContainer>
      <ScreenTitle
        badge="Student"
        title="Queue Status"
        subtitle="Live update of your queue progress."
        centered
      />

      <GlassCard style={[styles.card, statusCopy.tone]}>
        <Text style={styles.name}>{studentName || 'Student'}</Text>
        <Text style={styles.office}>{qrLabel || 'Office Queue'}</Text>

        <View style={styles.divider} />

        <Text style={styles.statusTitle}>{statusCopy.title}</Text>
        <Text style={styles.statusSubtitle}>{statusCopy.subtitle}</Text>

        {ticket.status === 'waiting' ? (
          <View style={styles.waitingVisualSection}>
            <WaitingOrb />
            <Text style={styles.waitingHint}>Hold tight. We will notify you once your turn starts.</Text>
          </View>
        ) : null}

        {ticket.status === 'waiting' && ticket.position ? (
          <View style={styles.positionBox}>
            <Text style={styles.positionLabel}>Your Position</Text>
            <Text style={styles.positionValue}>#{ticket.position}</Text>
            <Text style={styles.queueCount}>Total Waiting: {ticket.waitingCount}</Text>
          </View>
        ) : null}

      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  name: {
    color: colors.ink900,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  office: {
    marginTop: 3,
    color: colors.ink700,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    marginVertical: spacing.md,
    height: 1,
    backgroundColor: colors.border,
  },
  statusTitle: {
    color: colors.ink900,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusSubtitle: {
    marginTop: 4,
    color: colors.ink700,
    lineHeight: 21,
    textAlign: 'center',
  },
  waitingVisualSection: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loaderWrap: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
    borderColor: 'rgba(15, 118, 110, 0.2)',
  },
  spinnerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(15, 118, 110, 0.24)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  spinnerDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.primary,
  },
  loaderCore: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.2)',
  },
  waitingHint: {
    color: colors.ink700,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 260,
  },
  positionBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  positionLabel: {
    color: colors.ink500,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  positionValue: {
    marginTop: 2,
    color: colors.ink900,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
    textAlign: 'center',
  },
  queueCount: {
    color: colors.ink700,
    fontWeight: '600',
    textAlign: 'center',
  },
  waiting: {
    borderColor: colors.borderStrong,
  },
  serving: {
    borderColor: 'rgba(24, 169, 87, 0.3)',
    backgroundColor: '#F1FFF7',
  },
  done: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: '#ECFDF5',
  },
  notFound: {
    borderColor: 'rgba(220, 47, 86, 0.28)',
    backgroundColor: '#FFF5F8',
  },
});
