module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(svg)$': '<rootDir>/tests/mocks/svgMock.tsx',
    // jest-expo resolves the package's ESM "react-native" export; use its CJS build in tests.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
