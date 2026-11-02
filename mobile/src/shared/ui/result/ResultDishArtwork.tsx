import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { ComponentThemeProps } from '../types';

export function ResultDishArtwork({ source, uri, label, size = 88, winner, colors }: ComponentThemeProps & { source?: ImageSourcePropType; uri?: string; label: string; size?: number; winner?: boolean }) {
  const [failed, setFailed] = useState<string>();
  const identity = uri ?? String(source);
  const remote = uri?.startsWith('https://') ? { uri } : undefined;
  const actual = source ?? remote;
  return <View accessible accessibilityLabel={actual && failed !== identity ? label : `${label} · Chưa có ảnh`} style={[styles.frame, { width: size, height: size, borderRadius: size / 2, borderColor: winner ? colors?.green : colors?.line, backgroundColor: colors?.warm }]}>
    {actual && failed !== identity ? <Image source={actual} accessible={false} resizeMode="contain" onError={() => setFailed(identity)} style={styles.image} /> : <Text style={[styles.fallback, { color: colors?.text }]}>Chưa có ảnh</Text>}
  </View>;
}
const styles = StyleSheet.create({ frame: { maxWidth: '100%', aspectRatio: 1, borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 1 }, image: { width: '100%', height: '100%' }, fallback: { fontFamily: 'InterMedium', fontSize: 11, textAlign: 'center', padding: 4 } });
