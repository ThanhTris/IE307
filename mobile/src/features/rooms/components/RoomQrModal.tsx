import { useEffect, useState } from 'react';
import { Clipboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { createJoinRoomDeepLink, generateQrMatrix } from '../services/joinLinks';

export interface RoomQrModalProps {
  visible: boolean;
  code: string;
  onClose: () => void;
  onCopyLink?: (link: string) => void | Promise<void>;
}

export function RoomQrModal({ visible, code, onClose, onCopyLink }: RoomQrModalProps) {
  const { colors, dark } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const cleanCode = (code || '').trim().toUpperCase();
  const joinUrl = createJoinRoomDeepLink(cleanCode);
  const matrix = generateQrMatrix(joinUrl);
  const matrixSize = matrix.length;
  const qrPixelSize = 200;

  const handleCopy = async () => {
    try {
      if (onCopyLink) {
        await onCopyLink(joinUrl);
      } else {
        Clipboard.setString(joinUrl);
      }
      setCopied(true);
    } catch {
      // Do not set copied feedback on write failure
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng mã QR">
        <Pressable
          style={[styles.card, { backgroundColor: dark ? colors.surface : '#FFFFFF', borderColor: colors.line }]}
          onPress={e => e.stopPropagation()}
          accessibilityRole="dialog"
          accessibilityLabel="Mã QR phòng"
        >
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>
            Mã QR phòng
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }, textStyle(400)]}>
            Quét bằng ứng dụng Gì Cũng Được để vào phòng
          </Text>

          <View testID="qr-matrix-svg" style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.line }]}>
            <Svg width={qrPixelSize} height={qrPixelSize} viewBox={`0 0 ${matrixSize} ${matrixSize}`}>
              {matrix.map((row, r) =>
                row.map((active, c) =>
                  active ? (
                    <Rect
                      key={`${r}-${c}`}
                      x={c}
                      y={r}
                      width={1}
                      height={1}
                      fill="#1E293B"
                    />
                  ) : null
                )
              )}
            </Svg>
          </View>

          <View style={[styles.codeBadge, { backgroundColor: colors.warm, borderColor: colors.line }]}>
            <Text style={[styles.codeLabel, { color: colors.muted }, textStyle(500)]}>MÃ PHÒNG</Text>
            <Text selectable style={[styles.codeValue, { color: colors.primary }, textStyle(700)]}>
              {cleanCode}
            </Text>
          </View>

          {copied ? (
            <Text accessibilityLiveRegion="polite" style={[styles.copiedNotice, { color: colors.primary }, textStyle(600)]}>
              ✓ Đã sao chép liên kết vào phòng!
            </Text>
          ) : null}

          <View style={styles.actions}>
            <AppButton
              label={copied ? 'Đã sao chép' : 'Sao chép liên kết'}
              onPress={handleCopy}
              colors={colors}
            />
            <AppButton
              label="Đóng"
              variant="secondary"
              onPress={onClose}
              colors={colors}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  codeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  codeLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 3,
  },
  copiedNotice: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
});
