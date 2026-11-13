import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastHost } from '../../../shared/ui/feedback/Toast';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { SkeletonBlock } from '../../../shared/ui';

/** Google Maps search for the winning dish, embedded without an API key. Only google.com/maps pages may load. */
export function dishMapUrl(dishName: string): string {
  const query = `quán ${dishName.trim()}`.trim();
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=vi&output=embed`;
}

/** Google refuses the embed page when opened on its own ("must be used in an iframe"), so it is wrapped in one. */
export function dishMapHtml(dishName: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#f3f4f1}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${dishMapUrl(dishName)}" allowfullscreen loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe></body></html>`;
}

const BASE_URL = 'https://localhost/';
const allowed = (url: string) => url === 'about:blank' || url === BASE_URL || /^https:\/\/([a-z0-9-]+\.)*(google\.com|gstatic\.com|googleapis\.com)(\/|\?|$)/i.test(url);

export function EmbeddedDishMap({ dishName, height = 380, onFailed }: { dishName: string; height?: number; onFailed?: () => void }) {
  const { colors } = useShellTheme();
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  return <>
    <MapFrame dishName={dishName} height={height} onFailed={onFailed} testID="embedded-dish-map">
      <Pressable accessibilityRole="button" accessibilityLabel="Phóng to bản đồ" hitSlop={8} onPress={() => setExpanded(true)}
        style={[styles.corner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Ionicons name="expand" size={20} color={colors.text} />
      </Pressable>
    </MapFrame>
    <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
      <View style={[styles.full, { backgroundColor: colors.surface }]}>
        <MapFrame dishName={dishName} height="100%" testID="embedded-dish-map-full">
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng bản đồ" hitSlop={8} onPress={() => setExpanded(false)}
            // Below the status bar / notch on every phone, not a fixed offset.
            style={[styles.corner, { top: insets.top + 10, backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </MapFrame>
        {/* A Modal is its own window: toasts raised while it is open need a host here. */}
        <ToastHost />
      </View>
    </Modal>
  </>;
}

function MapFrame({ dishName, height, onFailed, testID, children }: { dishName: string; height: number | `${number}%`; onFailed?: () => void; testID: string; children?: React.ReactNode }) {
  const { colors } = useShellTheme();
  const [loading, setLoading] = useState(true);
  // Never leave the skeleton up forever if the page does not report that it finished.
  useEffect(() => { const timer = setTimeout(() => setLoading(false), 8000); return () => clearTimeout(timer); }, []);
  const full = height === '100%';
  return <View testID={testID} style={[styles.frame, full && styles.frameFull, { height, borderColor: colors.line, backgroundColor: colors.warm }]}>
    <WebView
      source={{ html: dishMapHtml(dishName), baseUrl: BASE_URL }}
      accessibilityLabel={`Bản đồ Google Maps tìm quán ${dishName}`}
      originWhitelist={['https://*', 'about:blank']}
      onShouldStartLoadWithRequest={request => allowed(request.url)}
      onLoadEnd={() => setLoading(false)}
      onError={() => { setLoading(false); onFailed?.(); }}
      onHttpError={() => { setLoading(false); onFailed?.(); }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      style={styles.web}
    />
    {loading ? <View pointerEvents="none" style={styles.loading}><SkeletonBlock height={full ? 600 : (height as number)} radius={0} colors={colors} /></View> : null}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  frameFull: { borderWidth: 0, borderRadius: 0, flex: 1 },
  full: { flex: 1 },
  corner: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
