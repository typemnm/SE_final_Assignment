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
    }),
    new webpack.NormalModuleReplacementPlugin(
      /^react-native-vector-icons(\/.*)?$/,
      path.resolve(__dirname, 'src/shims/react-native-vector-icons.js'),
    ),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
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
