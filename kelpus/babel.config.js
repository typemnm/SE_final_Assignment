module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.node'],
        alias: {
          '@components': './src/components',
          '@features': './src/features',
          '@store': './src/store',
          '@theme': './src/theme',
          '@appTypes': './src/types',
          '@utils': './src/utils',
          '@api': './src/api',
          '@navigation': './src/navigation',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
