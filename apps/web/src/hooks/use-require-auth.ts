import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';

/**
 * Hook to protect routes that require authentication
 *
 * IMPORTANT: This hook prevents flicker by tracking auth check state.
 * Content should NOT render until auth is verified.
 *
 * Usage:
 * ```tsx
 * export default function ProtectedPage() {
 *   const { shouldRenderContent, isCheckingAuth } = useRequireAuth();
 *
 *   if (isCheckingAuth) return <LoadingSpinner />;
 *   if (!shouldRenderContent) return null;
 *
 *   return <ProtectedContent />;
 * }
 * ```
 *
 * Flow:
 * 1. Check if wallet is connected
 * 2. Check if session is authenticated
 * 3. Redirect to /auth/signin if needed
 * 4. Only allow content render after auth verified
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const { status: sessionStatus } = useSession();

  // Track if we've completed initial auth check
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoading = sessionStatus === 'loading';

  useEffect(() => {
    // Mark that we've started checking (after session loads)
    if (!isLoading) {
      setHasCheckedAuth(true);
    }

    // Redirect if needed
    if (!isLoading && (!isConnected || !isAuthenticated)) {
      // Build full URL with query parameters
      const queryString = searchParams.toString();
      const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(fullPath)}`;
      console.log('Auth required - redirecting to:', redirectUrl);
      router.push(redirectUrl);
    }
  }, [isConnected, isAuthenticated, isLoading, pathname, searchParams, router]);

  return {
    // Only render content when:
    // 1. Not loading
    // 2. Has checked auth at least once
    // 3. Is authenticated
    shouldRenderContent: !isLoading && hasCheckedAuth && isAuthenticated,

    // Show loading when:
    // 1. Session is loading, OR
    // 2. Haven't checked auth yet, OR
    // 3. Not authenticated (will redirect)
    isCheckingAuth: isLoading || !hasCheckedAuth || !isAuthenticated,
  };
}
