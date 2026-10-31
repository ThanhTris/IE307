import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

export function SheetDialog({
  visible,
  title,
  children,
  onClose,
  colors,
}: ComponentThemeProps & {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, { backgroundColor: colors?.surface }]}>
          <View style={styles.sheetHandle} />
          <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>
            {title}
          </Text>
          {children}
          <AppButton label="Đóng" variant="quiet" onPress={onClose} colors={colors} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    padding: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.lg,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', alignSelf: 'center' },
  contextTitle: { ...typography.titleMedium },
});
