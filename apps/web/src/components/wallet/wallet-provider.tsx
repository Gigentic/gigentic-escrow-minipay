"use client"

import { useState, useEffect, createContext, useContext } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { SessionProvider } from 'next-auth/react'
import {
  injectedWallet,
  valoraWallet,
  // walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http, useConnect, useAccount, cookieStorage, createStorage, type State } from "wagmi";
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

// Check if running on server (SSR) or client
const isServer = typeof window === "undefined";

// Conditional connectors - only create during client-side rendering
// This prevents issues with browser-only APIs like indexedDB during SSR
const connectors = isServer
  ? []
  : connectorsForWallets(
      [
        {
          groupName: "Recommended",
          wallets: [
            injectedWallet,
            valoraWallet,
            // walletConnectWallet,
          ],
        },
      ],
      {
        appName: "Gigentic Escrow",
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
      }
    );

// Client-side wagmi config with conditional connectors
// Used by WalletProvider component
export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  // chains: [celo, celoSepolia, hardhat],
  connectors,
  transports: {
    // [hardhat.id]: http(),
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

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

export function WalletProvider({
  children,
  initialState
}: {
  children: React.ReactNode;
  initialState?: State | undefined;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until client-side
  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
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
