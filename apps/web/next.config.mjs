/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@perplexity/db', '@perplexity/core', '@perplexity/provider-perplexity'],
  webpack(webpackConfig) {
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return webpackConfig;
  },
};

export default config;
