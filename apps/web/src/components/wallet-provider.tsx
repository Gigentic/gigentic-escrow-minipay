"use client"

import { useState, useEffect } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  injectedWallet,
  walletConnectWallet,
  metaMaskWallet,
  baseAccount,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, celoAlfajores, hardhat } from 'wagmi/chains'
import { defineChain } from 'viem'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

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
        baseAccount,
        injectedWallet,
      ],
    },
  ],
  {
    appName: "Gigentic Escrow",
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  }
);

// Create a single wagmi config that supports all chains
const wagmiConfig = createConfig({
  chains: [celo, celoSepolia, hardhat],
  connectors,
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
    [hardhat.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

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
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
