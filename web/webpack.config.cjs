const path = require('path');
const webpack = require('webpack');
module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.js'),
  output: {path: path.resolve(__dirname, '../dist'), filename: 'bundle.js', publicPath: '/'},
  devtool: 'source-map',
  resolve: {
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {'react-native$': 'react-native-web', 'styled-components$': 'styled-components/native'},
  },
  module: {rules: [
    {test: /\.[jt]sx?$/, exclude: /node_modules\/(?!(@react-native|@react-navigation|react-native|react-navigation|react-clone-referenced-element)\b)/,
      use: {loader: 'babel-loader', options: {babelrc: false, configFile: false, presets: ['module:metro-react-native-babel-preset']}}},
    {test: /\.(png|jpg|jpeg|gif|svg|ttf)$/, type: 'asset/resource'},
  ]},
  plugins: [new webpack.DefinePlugin({__DEV__: JSON.stringify(true), 'process.env.NODE_ENV': JSON.stringify('development')})],
  devServer: {
    host: '127.0.0.1', port: 3110, allowedHosts: ['127.0.0.1', 'localhost', 'mylos-mac-mini.tail0c4e0a.ts.net'],
    static: [{directory: __dirname}, {directory: path.resolve(__dirname, '../node_modules/react-native-vector-icons/Fonts'), publicPath: '/assets'}],
    historyApiFallback: true,
    proxy: [{context: ['/api'], target: 'http://127.0.0.1:5051'}],
  },
};
