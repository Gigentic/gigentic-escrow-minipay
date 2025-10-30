import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import { useLogout } from './use-logout';

/**
 * Hook to sync wallet connection state with NextAuth session
 *
 * Prevents invalid states where user has an active session but no wallet connected.
 * This can happen when:
 * - User disconnects wallet externally (e.g., from MetaMask)
 * - Wallet extension is disabled or uninstalled
 * - Network/provider issues
 *
 * When detected, this hook automatically logs out the user to maintain consistency.
 *
 * Usage:
 * ```tsx
 * // In WalletProvider or root layout
 * useSyncWalletWithSession();
 * ```
 */
export function useSyncWalletWithSession() {
  const { isConnected, address } = useAccount();
  const { status: sessionStatus } = useSession();
  const logout = useLogout();
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    // Only check if we have an authenticated session
    if (sessionStatus !== 'authenticated') {
      hasLoggedOutRef.current = false;
      return;
    }

    // Invalid state: authenticated but wallet not connected
    if (!isConnected || !address) {
      // Prevent multiple logout attempts
      if (hasLoggedOutRef.current) {
        return;
      }

      console.warn('Invalid state detected: authenticated session but no wallet connected');
      console.log('Session status:', sessionStatus);
      console.log('Wallet connected:', isConnected);
      console.log('Wallet address:', address);
      console.log('Logging out to maintain consistency...');

      hasLoggedOutRef.current = true;

      // Log out and redirect to homepage
      logout().then(() => {
        console.log('Logged out due to wallet disconnect');
      });
    }
  }, [isConnected, address, sessionStatus, logout]);
}
