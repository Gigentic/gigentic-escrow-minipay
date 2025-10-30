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
  const { isConnected, address, status } = useAccount();
  const { status: sessionStatus } = useSession();
  const logout = useLogout();
  const hasLoggedOutRef = useRef(false);
  const prevConnectedRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    // Only check if we have an authenticated session
    if (sessionStatus !== 'authenticated') {
      hasLoggedOutRef.current = false;
      prevConnectedRef.current = undefined;
      return;
    }

    // Skip check while Wagmi is still initializing (prevents race condition)
    if (status === 'connecting' || status === 'reconnecting') {
      return;
    }

    // Skip check on first mount - wait for initial connection state to stabilize
    if (prevConnectedRef.current === undefined) {
      prevConnectedRef.current = isConnected;
      return;
    }

    // Invalid state: wallet WAS connected and NOW disconnected (actual user disconnect)
    if (prevConnectedRef.current && !isConnected) {
      // Prevent multiple logout attempts
      if (hasLoggedOutRef.current) {
        return;
      }

      console.warn('Invalid state detected: authenticated session but wallet disconnected');
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

    // Update previous connection state
    prevConnectedRef.current = isConnected;
  }, [isConnected, address, sessionStatus, status, logout]);
}
