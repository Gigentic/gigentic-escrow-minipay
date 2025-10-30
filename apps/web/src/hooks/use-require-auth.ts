import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';

/**
 * Hook to protect routes that require authentication
 *
 * Usage:
 * ```tsx
 * export default function ProtectedPage() {
 *   const { isLoading } = useRequireAuth();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return <ProtectedContent />;
 * }
 * ```
 *
 * Flow:
 * 1. Check if wallet is connected
 * 2. If not connected, redirect to /auth/signin with redirectTo param
 * 3. If connected but not authenticated, redirect to /auth/signin
 * 4. If authenticated, allow access
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { status: sessionStatus } = useSession();

  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoading = sessionStatus === 'loading';

  useEffect(() => {
    // Wait for session to load
    if (isLoading) return;

    // If not connected or not authenticated, redirect to sign-in
    if (!isConnected || !isAuthenticated) {
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(pathname)}`;
      console.log('Auth required - redirecting to:', redirectUrl);
      router.push(redirectUrl);
    }
  }, [isConnected, isAuthenticated, isLoading, pathname, router]);

  return {
    isLoading,
    isAuthenticated,
    isConnected,
  };
}
