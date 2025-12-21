const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const config = {
  mode: 'production',
  devtool: false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
  ],

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: 2, // Reduce parallelism to avoid hanging
        terserOptions: {
          compress: {
            pure_funcs: ['console.log', 'console.debug'],
            drop_console: false, // Keep this false to avoid aggressive compression
            passes: 1, // Limit compression passes
          },
          mangle: {
            safari10: true, // Fix Safari 10 loop iterator bug
          },
        },
        extractComments: false, // Don't extract comments to separate files
      }),
    ],
  },
};

module.exports = config;
