import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';

/**
 * Header shared by the round screens and their skeletons: the title centred, round buttons on the right. One place for
 * its height, title style and button column, so a skeleton and the real screen never differ.
 */
export function RoundHeader({ title, colors, children }: { title: string; colors: { text: string }; children?: ReactNode }) {
  return <View style={styles.header}>
    <View style={styles.side} />
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
    <View style={[styles.side, styles.actions]}>{children}</View>
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  side: { width: 96 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  title: { flex: 1, textAlign: 'center', fontFamily: 'InterBold', fontSize: 20, lineHeight: 28 },
});
