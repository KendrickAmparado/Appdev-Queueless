import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';

import { gradient, spacing } from '../theme';

export default function ScreenContainer({ children, scroll = true }) {
  const Content = scroll ? ScrollView : View;

  return (
    <LinearGradient colors={gradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Content
          style={styles.content}
          contentContainerStyle={scroll ? styles.scrollContent : undefined}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Content>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: 110,
  },
});
