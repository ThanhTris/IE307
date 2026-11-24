import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AppearanceChoice = 'system' | 'light' | 'dark';
export type TextSizeChoice = 'small' | 'medium' | 'large';
type Preferences = { appearance: AppearanceChoice; textSize: TextSizeChoice; notifications: boolean };
const defaults: Preferences = { appearance: 'system', textSize: 'medium', notifications: true };
const storageKey = 'gcd.app.preferences.v1';

type PreferencesContext = Preferences & {
  ready: boolean;
  update: (patch: Partial<Preferences>) => Promise<boolean>;
};
const Context = createContext<PreferencesContext>({ ...defaults, ready: true, update: async () => true });
export const useAppPreferences = () => useContext(Context);
export const appTextScales: Record<TextSizeChoice, number> = { small: 0.9, medium: 1, large: 1.15 };

function decode(raw: string | null): Preferences {
  if (!raw) return defaults;
  const row = JSON.parse(raw) as Partial<Preferences> | null;
  return {
    appearance: row?.appearance === 'light' || row?.appearance === 'dark' ? row.appearance : defaults.appearance,
    textSize: row?.textSize === 'small' || row?.textSize === 'large' ? row.textSize : defaults.textSize,
    notifications: typeof row?.notifications === 'boolean' ? row.notifications : defaults.notifications,
  };
}

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const current = useRef(defaults);
  const writes = useRef(Promise.resolve(true));

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => SecureStore.getItemAsync(storageKey)).then(decode).catch(() => defaults).then(value => {
      if (!active) return;
      current.current = value;
      setPreferences(value);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    setPreferences(next);
    const write = writes.current.then(async () => {
      try { await SecureStore.setItemAsync(storageKey, JSON.stringify(next)); return true; }
      catch { return false; }
    });
    writes.current = write;
    return write;
  }, []);

  return <Context.Provider value={{ ...preferences, ready, update }}>{children}</Context.Provider>;
}
