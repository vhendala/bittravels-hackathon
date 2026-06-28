/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`, // Proxy to Backend
      },
    ];
  },
  webpack: (config) => {
    // Privy SDK ships with optional peer-deps for many chains (Solana, Farcaster,
    // Stripe onramp, etc.) that we don't use. Setting them to false prevents
    // webpack from throwing "Module not found" errors for these unused packages.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
      '@farcaster/frame-wagmi-connector': false,
      '@farcaster/frame-core': false,
      '@stripe/crypto': false,
      '@stripe/stripe-js': false,
      '@solana/web3.js': false,
      '@solana/wallet-adapter-base': false,
    };
    return config;
  },
};

module.exports = nextConfig;
