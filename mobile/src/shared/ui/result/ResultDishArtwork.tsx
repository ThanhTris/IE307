import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { ComponentThemeProps } from '../types';

export function ResultDishArtwork({ source, uri, label, size = 88, winner, imageScale = 1, compact = false, colors }: ComponentThemeProps & { source?: ImageSourcePropType; uri?: string; label: string; size?: number; winner?: boolean; imageScale?: number; compact?: boolean }) {
  const [failed, setFailed] = useState<string>();
  const identity = uri ?? String(source);
  const remote = uri?.startsWith('https://') ? { uri } : undefined;
  const actual = source ?? remote;
  const artworkLabel = actual && failed !== identity ? label : `${label} · Chưa có ảnh`;
  return <View accessible accessibilityLabel={winner ? `${artworkLabel} · Món chiến thắng` : artworkLabel} style={[styles.frame, { width: size, height: size, borderRadius: size / 2, borderColor: winner ? colors?.primary : colors?.line, backgroundColor: colors?.warm }]}>
    {actual && failed !== identity ? <View style={[styles.clip, { borderRadius: size / 2 }]}><Image source={actual} accessible={false} resizeMode="contain" onError={() => setFailed(identity)} style={[styles.image, { transform: [{ scale: imageScale }] }]} /></View> : (
      <Text maxFontSizeMultiplier={compact ? 1.4 : undefined} style={[styles.fallback, compact && styles.compactFallback, { color: colors?.text }]}>Chưa có ảnh</Text>
    )}
  </View>;
}
const styles = StyleSheet.create({
  frame: { maxWidth: '100%', aspectRatio: 1, borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 1 },
  clip: { width: '100%', height: '100%', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  fallback: { fontFamily: 'InterMedium', fontSize: 11, textAlign: 'center', padding: 4 },
  compactFallback: { fontSize: 8, lineHeight: 10, paddingHorizontal: 3, paddingVertical: 1 },
});
