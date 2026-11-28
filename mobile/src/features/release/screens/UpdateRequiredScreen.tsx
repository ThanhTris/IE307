import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { FOCUSED_STYLE } from '../../../shared/ui/layout/ScreenContainer';
import { DEFAULT_PLAY_STORE_URL, isAllowedUpdateUrl } from '../services/minimumVersion';

export interface UpdateRequiredScreenProps {
  currentVersion: string;
  minimumVersion: string;
  updateUrl: string;
  message: string;
  onOpenUrl?: (url: string) => Promise<void>;
}

/** Blocking startup prompt shown when the installed app version is below the server minimum. */
export function UpdateRequiredScreen({
  currentVersion,
  minimumVersion,
  updateUrl,
  message,
  onOpenUrl,
}: UpdateRequiredScreenProps) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const targetUrl = isAllowedUpdateUrl(updateUrl) ? updateUrl : DEFAULT_PLAY_STORE_URL;

  const handleUpdatePress = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (onOpenUrl) {
        await onOpenUrl(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch {
      setError('Không mở được Google Play trên thiết bị này. Vui lòng cập nhật trực tiếp trong cửa hàng ứng dụng.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.warm }]}>
            <MaterialCommunityIcons name="cellphone-arrow-down" size={34} color={colors.primary} accessible={false} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>
            Cần cập nhật
          </Text>
          <Text style={[styles.message, { color: colors.muted }, textStyle(400)]}>
            {message}
          </Text>
          <View style={[styles.versions, { borderColor: colors.line, backgroundColor: colors.warm }]}>
            <View style={styles.versionRow}>
              <Text style={[styles.versionLabel, { color: colors.muted }, textStyle(500)]}>Phiên bản hiện tại</Text>
              <Text style={[styles.versionValue, { color: colors.text }, textStyle(700)]}>{currentVersion}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={[styles.versionLabel, { color: colors.muted }, textStyle(500)]}>Phiên bản tối thiểu</Text>
              <Text style={[styles.versionValue, { color: colors.primary }, textStyle(700)]}>{minimumVersion}</Text>
            </View>
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }, textStyle(500)]}>
              {error}
            </Text>
          ) : null}
          <AppButton
            label="Cập nhật ứng dụng"
            loading={busy}
            disabled={busy}
            onPress={() => { void handleUpdatePress(); }}
            colors={colors}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', ...FOCUSED_STYLE },
  card: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 16, alignItems: 'stretch' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 24, lineHeight: 32, textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  versions: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  versionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  versionLabel: { fontSize: 14, lineHeight: 20 },
  versionValue: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
