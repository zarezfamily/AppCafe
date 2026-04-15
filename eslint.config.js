const js = require('@eslint/js');
const globals = require('globals');
const reactPlugin = require('eslint-plugin-react');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.expo-shared/**',
      '.firebase/**',
      'dist/**',
      'web-build/**',
      'build/**',
      'coverage/**',
      'ios/**',
      'android/**',
      '.github/**',

      'functions/lib/**',
      'web/**/*.js',
      'seed_cafes_v2.js',
      'seed5.js',
      'seed10.js',
      'delete_cafes.js',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/jsx-uses-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$|^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-boolean-cast': 'warn',
      'no-useless-escape': 'warn',
      'no-sparse-arrays': 'warn',
      'no-undef': 'error',
    },
  },
];