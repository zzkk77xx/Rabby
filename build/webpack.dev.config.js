const webpack = require('webpack');

// for extension local test, can build each time
const config = {
  mode: 'development',
  devtool: 'cheap-module-source-map', // CSP-compliant for Chrome extensions, better memory usage than inline
  watch: true,
  watchOptions: {
    ignored: ['**/public', '**/node_modules'],
    followSymlinks: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('DEV'),
      'process.env.DEBUG': true,
    }),
  ],
};

module.exports = config;
