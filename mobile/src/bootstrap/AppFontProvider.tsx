import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as Font from 'expo-font';
import type { TextStyle } from 'react-native';

export type InterWeight = 400 | 500 | 600 | 700;
export type AppFontStatus = 'loading' | 'ready' | 'fallback';

const fontAssets = {
  InterRegular: require('../../assets/fonts/Inter-Regular.ttf'),
  InterMedium: require('../../assets/fonts/Inter-Medium.ttf'),
  InterSemiBold: require('../../assets/fonts/Inter-SemiBold.ttf'),
  InterBold: require('../../assets/fonts/Inter-Bold.ttf'),
};

const familyForWeight: Record<InterWeight, keyof typeof fontAssets> = {
  400: 'InterRegular',
  500: 'InterMedium',
  600: 'InterSemiBold',
  700: 'InterBold',
};

type FontContextValue = {
  status: AppFontStatus;
  textStyle: (weight: InterWeight) => TextStyle;
};

const FontContext = createContext<FontContextValue>({
  status: 'fallback',
  textStyle: weight => ({ fontWeight: String(weight) as TextStyle['fontWeight'] }),
});

export type FontLoader = () => Promise<void>;

const loadInterFonts: FontLoader = () => Font.loadAsync(fontAssets);

export function AppFontProvider({ children, loadFonts = loadInterFonts }: PropsWithChildren<{ loadFonts?: FontLoader }>) {
  const [status, setStatus] = useState<AppFontStatus>('loading');

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(loadFonts).then(
      () => { if (active) setStatus('ready'); },
      () => { if (active) setStatus('fallback'); },
    );
    return () => { active = false; };
  }, [loadFonts]);

  const value = useMemo<FontContextValue>(() => ({
    status,
    textStyle: weight => status === 'ready'
      ? { fontFamily: familyForWeight[weight], fontWeight: 'normal' }
      : { fontWeight: String(weight) as TextStyle['fontWeight'] },
  }), [status]);

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useAppFonts() {
  return useContext(FontContext);
}

export const interFontFamilies = familyForWeight;
