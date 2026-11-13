import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

// The embedded Google Maps view needs a native WebView; tests render a plain placeholder instead.
jest.mock('react-native-webview', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { WebView: (props: { accessibilityLabel?: string }) => createElement(View, { accessibilityLabel: props.accessibilityLabel, testID: 'webview' }) };
});
