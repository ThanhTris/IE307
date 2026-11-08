import { ActivityIndicator, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

export type CollectionStateKind = 'loading' | 'empty' | 'error' | 'unavailable';

export function CollectionState({
  state,
  title,
  message,
  iconSource,
  actionLabel,
  onAction,
  colors,
}: ComponentThemeProps & {
  state: CollectionStateKind;
  title: string;
  message?: string;
  iconSource?: ImageSourcePropType;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion={state === 'loading' ? 'polite' : 'none'}
      style={[styles.collectionState, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      {state === 'loading' ? (
        <ActivityIndicator accessibilityLabel={title} color={colors?.primary} />
      ) : iconSource ? (
        <Image source={iconSource} accessible={false} resizeMode="contain" style={styles.collectionIcon} />
      ) : null}
      <Text accessibilityRole="header" style={[styles.noticeTitle, { color: colors?.text }]}>
        {title}
      </Text>
      {message ? <Text style={[styles.body, { color: colors?.muted }]}>{message}</Text> : null}
      {actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  collectionState: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  collectionIcon: { width: 40, height: 40 },
  noticeTitle: { ...typography.bodyBold },
  body: { ...typography.body },
});
