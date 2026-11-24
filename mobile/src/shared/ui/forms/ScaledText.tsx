import { createContext, forwardRef, useContext, type ComponentRef } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextInputProps, type TextProps } from 'react-native';
import { appTextScales, useAppPreferences } from '../../lib/AppPreferences';

const NestedText = createContext(false);
const defaultFontSize = 14;

function scaledStyle(style: TextProps['style'], scale: number, nested = false) {
  if (scale === 1) return style;
  const metrics = StyleSheet.flatten(style);
  const fontSize = metrics?.fontSize ?? (nested ? undefined : defaultFontSize);
  return [style, {
    ...(fontSize === undefined ? {} : { fontSize: fontSize * scale }),
    ...(metrics?.lineHeight === undefined ? {} : { lineHeight: metrics.lineHeight * scale }),
  }];
}

export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(function Text({ style, children, ...props }, ref) {
  const { textSize } = useAppPreferences();
  const nested = useContext(NestedText);
  const scale = props.allowFontScaling === false ? 1 : appTextScales[textSize];
  return <NativeText {...props} ref={ref} style={scaledStyle(style, scale, nested)}>
    {nested ? children : <NestedText.Provider value>{children}</NestedText.Provider>}
  </NativeText>;
});

export const TextInput = forwardRef<ComponentRef<typeof NativeTextInput>, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const { textSize } = useAppPreferences();
  const scale = props.allowFontScaling === false ? 1 : appTextScales[textSize];
  return <NativeTextInput {...props} ref={ref} style={scaledStyle(style, scale)} />;
});
