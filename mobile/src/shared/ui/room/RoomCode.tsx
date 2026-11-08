import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

export function RoomCode({ code, onCopy, colors }: ComponentThemeProps & { code: string; onCopy?: () => void }) {
  return (
    <View style={[styles.roomCodeCard, { backgroundColor: colors?.warm, borderColor: colors?.line }]}>
      <Text style={[styles.caption, { color: colors?.muted }]}>MÃ PHÒNG</Text>
      <Text accessibilityLabel={`Mã phòng ${code}`} style={[styles.roomCode, { color: colors?.primary }]}>
        {code.trim().toUpperCase()}
      </Text>
      <AppButton label="Sao chép mã" variant="secondary" onPress={onCopy} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  roomCodeCard: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.md,
  },
  roomCode: { ...typography.roomCode },
  caption: { ...typography.caption },
});
