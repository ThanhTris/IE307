import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

/** Live camera preview that reports each distinct QR payload once. Permission is requested before this mounts. */
export function QrCameraScanner({ onScanned }: { onScanned: (raw: string) => void }) {
  const { colors } = useShellTheme();
  const last = useRef('');
  return <View style={[styles.frame, { borderColor: colors.primary }]}>
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      accessibilityLabel="Camera quét mã QR"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={result => {
        if (!result.data || result.data === last.current) return;
        last.current = result.data;
        onScanned(result.data);
      }}
    />
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 320, aspectRatio: 1, borderWidth: 2, borderRadius: 24, overflow: 'hidden', alignSelf: 'center' },
});
