const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx', '.jsx'],
    alias: {
      'react-native$': 'react-native-web',
      // tsconfig.json paths → webpack aliases
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@theme': path.resolve(__dirname, 'src/theme'),
      '@appTypes': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@navigation': path.resolve(__dirname, 'src/navigation'),
      // native-only module shims
      'react-native-maps': path.resolve(__dirname, 'src/shims/react-native-maps.js'),
      'react-native-health-connect': path.resolve(__dirname, 'src/shims/react-native-health-connect.js'),
      'react-native-permissions': path.resolve(__dirname, 'src/shims/react-native-permissions.js'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/shims/react-native-async-storage.js'),
      'react-native-keychain': path.resolve(__dirname, 'src/shims/react-native-keychain.js'),
      'react-native-google-signin': path.resolve(__dirname, 'src/shims/react-native-google-signin.js'),
      '@invertase/react-native-apple-authentication': path.resolve(__dirname, 'src/shims/react-native-apple-authentication.js'),
      '@react-native-kakao/user': path.resolve(__dirname, 'src/shims/react-native-kakao-user.js'),
      'react-native-health': path.resolve(__dirname, 'src/shims/react-native-health.js'),
      'react-native-image-picker': path.resolve(__dirname, 'src/shims/react-native-image-picker.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules\/(?!(react-native-web|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-chart-kit|react-native-svg)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: false,
            babelrc: false,
            presets: [
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] }, loose: true }],
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              ['@babel/plugin-transform-class-properties', { loose: true }],
              ['@babel/plugin-transform-private-methods', { loose: true }],
              ['@babel/plugin-transform-private-property-in-object', { loose: true }],
              'react-native-reanimated/plugin',
            ],
          },
        },
      },
      {
        test: /\.(png|jpg|gif|svg|ttf|woff|woff2|eot)$/,
        use: [{ loader: 'url-loader', options: { limit: 8192 } }],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || ''),
      'process.env.GOOGLE_WEB_CLIENT_ID': JSON.stringify(process.env.GOOGLE_WEB_CLIENT_ID || ''),
    }),
    new webpack.NormalModuleReplacementPlugin(
      /^react-native-vector-icons(\/.*)?$/,
      path.resolve(__dirname, 'src/shims/react-native-vector-icons.js'),
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^@react-native\/assets-registry(\/.*)?$/,
      path.resolve(__dirname, 'src/shims/assets-registry.js'),
    ),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  ignoreWarnings: [
    {
      module: /react-native-screens/,
      message: /export 'FooterComponent'/,
    },
  ],
  devServer: {
    port: 8080,
    historyApiFallback: true,
    hot: true,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    ],
  },
};
