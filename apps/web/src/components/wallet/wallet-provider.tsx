"use client"

import { useState, useEffect, createContext, useContext } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { SessionProvider } from 'next-auth/react'
import {
  metaMaskWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http, useConnect, useAccount } from "wagmi";
import { celo, hardhat } from 'wagmi/chains'
import { defineChain } from 'viem'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useManualSign } from '@/hooks/use-manual-sign'
import { useAddressChangeLogout } from '@/hooks/use-address-change-logout'
import { useSyncWalletWithSession } from '@/hooks/use-sync-wallet-with-session'
import { AuthLoadingOverlay } from '../auth/auth-loading-overlay'

// Create context for authentication state
interface AuthContextValue {
  isAuthenticating: boolean;
  signIn: () => Promise<void>;
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
        injectedWallet,
        metaMaskWallet,
        // walletConnectWallet,
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // Fresh for 30 seconds
      gcTime: 5 * 60_000, // Keep in memory for 5 minutes (replaces cacheTime)
      refetchOnMount: true, // Refetch when component mounts if data is stale
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
      retry: 1, // Only retry failed requests once
    },
  },
});

function RainbowKitWithAutoAuth({ children }: { children: React.ReactNode }) {
  // Manual sign-in with SIWE (no auto-trigger)
  const { isAuthenticating, signIn } = useManualSign();

  // Handle wallet address changes by logging out
  useAddressChangeLogout();

  // Sync wallet connection with session (prevent invalid states)
  useSyncWalletWithSession();

  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  // Auto-connect for MiniPay environment
  useEffect(() => {
    if (typeof window !== 'undefined' &&
        window.ethereum?.isMiniPay &&
        !isConnected) {
      // Find the injected connector and connect automatically
      const injectedConnector = connectors.find(
        connector => connector.type === 'injected'
      );

      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [isConnected, connect, connectors]);

  // Note: Redirect logic is now handled in /auth/signin page
  // based on the redirectTo query parameter
  // We don't auto-redirect here to avoid conflicts

  return (
    <AuthContext.Provider value={{ isAuthenticating, signIn }}>
      <RainbowKitProvider modalSize="compact">
        {children}
        <AuthLoadingOverlay isAuthenticating={isAuthenticating} />
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
