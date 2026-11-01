import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

const tutorialGestures = [
  { id: 'tap', label: 'Chạm', icon: '☝' },
  { id: 'swipe-left', label: 'Vuốt trái', icon: '☝  ←' },
  { id: 'swipe-right', label: 'Vuốt phải', icon: '☝  →' },
  { id: 'double-tap', label: 'Nhấn đúp', icon: '☝  ×2' },
] as const;

export function TutorialGesture({
  title,
  instruction,
  buttonLabel = 'Thử bằng nút',
  onPress,
  colors,
}: ComponentThemeProps & {
  title: string;
  instruction: string;
  buttonLabel?: string;
  onPress: () => void;
}) {
  return (
    <View
      accessibilityRole="summary"
      style={[styles.tutorialCard, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      <Text accessibilityRole="header" style={[styles.noticeTitle, { color: colors?.text }]}>
        {title}
      </Text>
      <Text style={[styles.body, { color: colors?.muted }]}>{instruction}</Text>
      {(['dark', 'light'] as const).map(tone => (
        <ScrollView
          key={tone}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gestureRow}
          accessibilityLabel={tone === 'dark' ? 'Thao tác nền đậm' : 'Thao tác nền sáng'}
        >
          {tutorialGestures.map(gesture => {
            const darkTone = tone === 'dark';
            const tileBackground = darkTone ? colors?.text : colors?.warm;
            const foreground = darkTone ? colors?.surface : colors?.text;
            return (
              <View
                key={`${tone}-${gesture.id}`}
                accessibilityLabel={`${gesture.label}, ${tone === 'dark' ? 'nền đậm' : 'nền sáng'}`}
                style={[styles.gestureTile, { backgroundColor: tileBackground }]}
              >
                <Text accessible={false} style={[styles.gestureIcon, { color: foreground }]}>
                  {gesture.icon}
                </Text>
                <Text style={[styles.gestureLabel, { color: foreground }]}>{gesture.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      ))}
      <AppButton label={buttonLabel} variant="secondary" onPress={onPress} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  tutorialCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  noticeTitle: { ...typography.bodyBold },
  body: { ...typography.body },
  gestureRow: { gap: spacing.sm },
  gestureTile: {
    width: 112,
    minHeight: 88,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  gestureIcon: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  gestureLabel: { ...typography.caption, textAlign: 'center' },
});
