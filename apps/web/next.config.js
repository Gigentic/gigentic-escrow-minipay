/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  swcMinify: true, // 7x faster than Terser
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.module.exprContextCritical = false;

    // Suppress React Native warnings from MetaMask SDK (not needed for web)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    }

    return config
  },
};

module.exports = nextConfig;
