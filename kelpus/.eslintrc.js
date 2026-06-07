module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // @react-native/eslint-config 0.75 still references the removed
    // @typescript-eslint v8 rule; keep lint runnable without downgrading deps.
    '@typescript-eslint/func-call-spacing': 'off',
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
  },
  overrides: [
    {
      files: ['*.config.js', 'metro.config.js', 'webpack.config.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['src/shims/*.js'],
      env: {
        browser: true,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
