import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

export function SheetDialog({
  visible,
  title,
  children,
  onClose,
  colors,
  presentation = 'sheet',
  showClose = true,
  showHandle = true,
  closeLabel = 'Đóng',
  backdropColor,
}: ComponentThemeProps & {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  presentation?: 'sheet' | 'dialog';
  showClose?: boolean;
  showHandle?: boolean;
  closeLabel?: string;
  backdropColor?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.modalBackdrop, presentation === 'dialog' && styles.centered, backdropColor ? { backgroundColor: backdropColor } : undefined]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <View accessibilityViewIsModal style={[styles.sheet, presentation === 'dialog' && styles.dialog, { backgroundColor: colors?.surface }]}>
          {showHandle && presentation === 'sheet' ? <View style={styles.sheetHandle} /> : null}
          <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>
            {title}
          </Text>
          {children}
          {showClose ? <AppButton label={closeLabel} variant="quiet" onPress={onClose} colors={colors} style={styles.close} /> : null}
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  centered: { justifyContent: 'center', paddingHorizontal: spacing.xl },
  keyboard: { flexShrink: 1, width: '100%', maxHeight: '95%' },
  sheet: {
    padding: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.lg,
    flexShrink: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  dialog: { borderRadius: radii.xl },
  close: { backgroundColor: 'transparent', borderWidth: 0 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', alignSelf: 'center' },
  contextTitle: { ...typography.titleMedium },
});
