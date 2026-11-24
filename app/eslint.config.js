// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const a11yPlugin = require('eslint-plugin-react-native-a11y');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: { 'react-native-a11y': a11yPlugin },
    rules: {
      ...Object.fromEntries(
        Object.keys(a11yPlugin.rules).map((rule) => [`react-native-a11y/${rule}`, 'warn']),
      ),
      // Hints are for non-obvious actions only (Apple/Google HIG) — requiring one on
      // every labeled element is noise, not a real defect.
      'react-native-a11y/has-accessibility-hint': 'off',
    },
  },
  {
    ignores: ['dist/*', 'ios/*', 'android/*'],
  },
]);
