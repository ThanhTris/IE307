import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
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

export function EmbeddedDishMap({ dishName, height = 260, onFailed }: { dishName: string; height?: number; onFailed?: () => void }) {
  const { colors } = useShellTheme();
  const [loading, setLoading] = useState(true);
  // Never leave the skeleton up forever if the page does not report that it finished.
  useEffect(() => { const timer = setTimeout(() => setLoading(false), 8000); return () => clearTimeout(timer); }, []);
  return <View testID="embedded-dish-map" style={[styles.frame, { height, borderColor: colors.line, backgroundColor: colors.warm }]}>
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
    {loading ? <View pointerEvents="none" style={styles.loading}><SkeletonBlock height={height} radius={0} colors={colors} /></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
