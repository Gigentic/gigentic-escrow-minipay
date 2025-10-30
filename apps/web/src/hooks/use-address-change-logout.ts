import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import { useLogout } from './use-logout';

/**
 * Hook to handle wallet address changes by logging out the user
 *
 * When a user switches their wallet address in MetaMask (or any wallet),
 * this hook detects the change and:
 * 1. Signs out the current NextAuth session
 * 2. Disconnects the wallet
 * 3. Redirects to homepage
 *
 * This ensures the session always matches the connected wallet address.
 */
export function useAddressChangeLogout() {
  const { address, isConnected } = useAccount();
  const { status: sessionStatus } = useSession();
  const logout = useLogout();
  const previousAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only proceed if wallet is connected
    if (!isConnected || !address) {
      // Reset the ref when disconnected
      previousAddressRef.current = undefined;
      return;
    }

    // If this is the first time we're seeing an address, just store it
    if (previousAddressRef.current === undefined) {
      previousAddressRef.current = address;
      return;
    }

    // Detect if the address has changed
    const hasAddressChanged = previousAddressRef.current.toLowerCase() !== address.toLowerCase();

    if (hasAddressChanged) {
      console.log('Wallet address changed - logging out user');
      console.log('Previous address:', previousAddressRef.current);
      console.log('New address:', address);

      // Update the ref immediately to prevent multiple triggers
      previousAddressRef.current = address;

      // Use centralized logout (includes signOut → disconnect → redirect)
      // This fixes race condition by awaiting signOut before disconnect
      logout().then(() => {
        console.log('User logged out due to address change');
      });
    }
  }, [address, isConnected, sessionStatus, logout]);
}
