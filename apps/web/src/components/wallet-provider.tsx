"use client"

import { useState, useEffect } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, connectorsForWallets, RainbowKitAuthenticationProvider, AuthenticationStatus } from '@rainbow-me/rainbowkit'
import { SessionProvider, useSession } from 'next-auth/react'
import {
  injectedWallet,
  walletConnectWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, celoAlfajores, hardhat } from 'wagmi/chains'
import { defineChain } from 'viem'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { createCustomAuthAdapter } from '@/lib/auth-adapter'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { AuthSuccessNotification } from './auth-success-notification'
import { AuthLoadingOverlay } from './auth-loading-overlay'

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
        metaMaskWallet,
        walletConnectWallet,
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
const authAdapter = createCustomAuthAdapter();

function RainbowKitProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  // Auto-trigger signature when wallet connects
  const { showSuccess, isAuthenticating } = useAutoSign();

  const authenticationStatus: AuthenticationStatus = (() => {
    switch (status) {
      case 'loading':
        return 'loading';
      case 'authenticated':
        return 'authenticated';
      case 'unauthenticated':
      default:
        return 'unauthenticated';
    }
  })();

  return (
    <RainbowKitAuthenticationProvider
      adapter={authAdapter}
      status={authenticationStatus}
    >
      <RainbowKitProvider modalSize="compact">
        {children}
        <AuthLoadingOverlay isAuthenticating={isAuthenticating} />
        <AuthSuccessNotification show={showSuccess} />
      </RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
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
          <RainbowKitProviderWithAuth>
            {children}
          </RainbowKitProviderWithAuth>
        </QueryClientProvider>
      </SessionProvider>
    </WagmiProvider>
  );
}
