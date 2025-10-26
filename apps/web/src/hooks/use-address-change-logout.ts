import { useEffect, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  const { disconnect } = useDisconnect();
  const router = useRouter();
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

      // Sign out the current session if authenticated
      if (sessionStatus === 'authenticated') {
        signOut({ redirect: false }).then(() => {
          console.log('Session invalidated due to address change');
          // Redirect to homepage after logout
          router.push('/');
        });
      } else {
        // If not authenticated, still redirect to homepage
        router.push('/');
      }

      // Disconnect the wallet to force re-authentication
      disconnect();
    }
  }, [address, isConnected, sessionStatus, disconnect, router]);
}
