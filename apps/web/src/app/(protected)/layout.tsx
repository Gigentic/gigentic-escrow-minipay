"use client";

import dynamic from 'next/dynamic';
import { Navbar } from '@/components/navbar';

// Load WalletProvider only on client-side to avoid IndexedDB errors during SSR/build
const WalletProvider = dynamic(
  () => import('@/components/wallet/wallet-provider').then(mod => ({ default: mod.WalletProvider })),
  { ssr: false }
);

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <WalletProvider>
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
      </WalletProvider>
    </div>
  );
}
