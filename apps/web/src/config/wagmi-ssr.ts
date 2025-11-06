import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { celo } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define Celo Sepolia chain
const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'CELO',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: {
      http: ['https://forno.celo-sepolia.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Celo Sepolia Blockscout',
      url: 'https://celo-sepolia.blockscout.com',
    },
  },
  testnet: true,
});

// Server-side config for SSR with empty connectors
// Used by layout.tsx for cookieToInitialState
export const wagmiSsrConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [],  // Empty connectors for server-side rendering
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
