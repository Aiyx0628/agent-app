import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

// PDF worker as asset/resource so require() returns a URL string
rules.push({
  test: /pdfjs-dist[/\\]build[/\\]pdf\.worker\.m?js$/,
  type: 'asset/resource',
  generator: { filename: 'pdf.worker.js' },
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
