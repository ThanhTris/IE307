import type { ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
  nativeAnimation = 'slide',
  backdropAnimation,
  panelAnimation,
  showTitle = true,
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
  nativeAnimation?: 'none' | 'slide' | 'fade';
  backdropAnimation?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  panelAnimation?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  showTitle?: boolean;
}) {
  return (
    <Modal testID="sheet-dialog" visible={visible} transparent animationType={nativeAnimation} onRequestClose={onClose}>
      <View style={styles.root}>
      <Animated.View testID="dialog-backdrop" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor ?? 'rgba(0,0,0,0.45)' }, backdropAnimation]} />
      <SafeAreaView edges={['top', 'bottom']} style={[styles.modalBackdrop, presentation === 'dialog' && styles.centered]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <Animated.View testID="dialog-panel" accessibilityViewIsModal style={[styles.sheet, presentation === 'dialog' && styles.dialog, { backgroundColor: colors?.surface }, panelAnimation]}>
          {showHandle && presentation === 'sheet' ? <View style={styles.sheetHandle} /> : null}
          {showTitle ? <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>
            {title}
          </Text> : null}
          {children}
          {showClose ? <AppButton label={closeLabel} variant="quiet" onPress={onClose} colors={colors} style={styles.close} /> : null}
        </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
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
