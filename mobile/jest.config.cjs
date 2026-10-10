module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
