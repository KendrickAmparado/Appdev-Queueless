import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

export default function ScreenContainer({ children, scroll = true, stickyHeader = true }) {
  const Content = scroll ? ScrollView : View;

  return (
    <View style={styles.shell}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Content
          style={styles.content}
          contentContainerStyle={scroll ? styles.scrollContent : undefined}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={scroll && stickyHeader ? [0] : undefined}
        >
          {children}
        </Content>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: 110,
  },
});
