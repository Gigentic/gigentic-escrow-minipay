"use client"

import { useState, useEffect, createContext, useContext } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { SessionProvider } from 'next-auth/react'
import {
  injectedWallet,
  walletConnectWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, hardhat } from 'wagmi/chains'
import { defineChain } from 'viem'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { AuthSuccessNotification } from './auth-success-notification'
import { AuthLoadingOverlay } from './auth-loading-overlay'

// Create context for authentication state
interface AuthContextValue {
  isAuthenticating: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthState() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within WalletProvider');
  }
  return context;
}

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
})

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        // metaMaskWallet,
        // walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: "Gigentic Escrow",
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  }
);


// Create configs for each supported chain
const chainConfigs = {
  // celoAlfajores: createConfig({
  //   chains: [celoAlfajores],
  //   connectors,
  //   transports: { [celoAlfajores.id]: http() },
  //   ssr: true,
  // }),
  hardhat: createConfig({
    chains: [hardhat],
    connectors,
    transports: { [hardhat.id]: http() },
    ssr: true,
  }),
  celo: createConfig({
    chains: [celo],
    connectors,
    transports: { [celo.id]: http() },
    ssr: true,
  }),
  celoSepolia: createConfig({
    chains: [celoSepolia],
    connectors,
    transports: { [celoSepolia.id]: http() },
    ssr: true,
  }),
};

// Select config based on environment variable
const selectedChainKey = process.env.NEXT_PUBLIC_CHAIN! as keyof typeof chainConfigs;
const wagmiConfig = chainConfigs[selectedChainKey];

const queryClient = new QueryClient();

function RainbowKitWithAutoAuth({ children }: { children: React.ReactNode }) {
  // Auto-trigger signature when wallet connects
  const { showSuccess, isAuthenticating } = useAutoSign();

  return (
    <AuthContext.Provider value={{ isAuthenticating }}>
      <RainbowKitProvider modalSize="compact">
        {children}
        <AuthLoadingOverlay isAuthenticating={isAuthenticating} />
        <AuthSuccessNotification show={showSuccess} />
      </RainbowKitProvider>
    </AuthContext.Provider>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until client-side
  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <SessionProvider refetchInterval={0}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWithAutoAuth>
            {children}
          </RainbowKitWithAutoAuth>
        </QueryClientProvider>
      </SessionProvider>
    </WagmiProvider>
  );
}
