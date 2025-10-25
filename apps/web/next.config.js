// Polyfill indexedDB for server-side builds
if (typeof globalThis.indexedDB === 'undefined') {
  globalThis.indexedDB = undefined;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Suppress React Native warnings from MetaMask SDK (not needed for web)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    }

    return config
  },
};

module.exports = nextConfig;
