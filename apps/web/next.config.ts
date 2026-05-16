import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@perplexity/db', '@perplexity/core', '@perplexity/provider-perplexity'],
};

export default config;
