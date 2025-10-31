import { useCallback } from 'react';
import { useDisconnect } from 'wagmi';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Centralized logout hook
 *
 * Provides a consistent logout flow across the application:
 * 1. Sign out NextAuth session (clears JWT)
 * 2. Disconnect wallet (clears wagmi connection)
 * 3. Redirect to homepage (optional)
 *
 * Usage:
 * ```tsx
 * const logout = useLogout();
 * await logout(); // With redirect
 * await logout({ redirect: false }); // Without redirect
 * ```
 */
export function useLogout() {
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const logout = useCallback(
    async (options?: { redirect?: boolean }) => {
      const shouldRedirect = options?.redirect !== false; // Default true

      try {
        console.log('Logging out user...');

        // Step 1: Sign out NextAuth session first (to prevent auto-redirects)
        await signOut({ redirect: false });
        console.log('NextAuth session cleared');

        // Step 2: Disconnect wallet
        disconnect();
        console.log('Wallet disconnected');

        // Step 3: Small delay to ensure disconnect completes
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 4: Redirect to homepage (if requested)
        if (shouldRedirect) {
          router.push('/');
          console.log('Redirected to homepage');
        }
      } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, try to disconnect wallet
        disconnect();
        if (shouldRedirect) {
          router.push('/');
        }
      }
    },
    [disconnect, router]
  );

  return logout;
}
