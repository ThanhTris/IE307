const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  { files: ['scripts/**/*.cjs'], languageOptions: { globals: { __dirname: 'readonly' } } },
  { ignores: ['dist/**', 'coverage/**', '.expo/**', 'android/**', 'ios/**'] },
]);
