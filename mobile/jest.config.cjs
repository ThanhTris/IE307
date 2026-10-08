module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  clearMocks: true,
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/features/bootstrap/services/**/*.ts'],
};
