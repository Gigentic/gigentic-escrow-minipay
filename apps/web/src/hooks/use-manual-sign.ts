import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { getCsrfToken, signIn as nextAuthSignIn } from 'next-auth/react';
import { useLogout } from './use-logout';

export function useManualSign() {
  const { address, isConnected, chainId } = useAccount();
  const { status: sessionStatus } = useSession();
  const { signMessageAsync } = useSignMessage();
  const logout = useLogout();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const isAuthenticatingRef = useRef(false);

  const signIn = useCallback(async () => {
    // Prevent multiple simultaneous authentication attempts
    if (isAuthenticatingRef.current || !address || !chainId || !isConnected) {
      return;
    }

    try {
      setIsAuthenticating(true);
      isAuthenticatingRef.current = true;

      // Get nonce
      const nonce = await getCsrfToken();
      if (!nonce) {
        console.error('Failed to get CSRF token');
        await logout({ redirect: false });
        return;
      }

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to Gigentic Escrow',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });

      const preparedMessage = message.prepareMessage();

      // Request signature
      const signature = await signMessageAsync({
        message: preparedMessage,
      });

      // Verify signature via NextAuth
      const result = await nextAuthSignIn('credentials', {
        message: preparedMessage,
        signature,
        redirect: false,
      });

      if (result?.ok) {
        console.log('Authentication successful');
        // Show success state briefly
        setShowSuccess(true);
        setAuthSuccess(true);
        // Hide success notification after delay
        setTimeout(() => {
          setShowSuccess(false);
        }, 500);
      } else {
        console.error('Authentication failed:', result?.error);
        // Disconnect wallet on authentication failure
        await logout({ redirect: false });
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      // Disconnect wallet when user cancels signature
      await logout({ redirect: false });
    } finally {
      setIsAuthenticating(false);
      isAuthenticatingRef.current = false;
    }
  }, [address, chainId, isConnected, signMessageAsync, logout]);

  // Reset state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setShowSuccess(false);
      setAuthSuccess(false);
      isAuthenticatingRef.current = false;
    }
  }, [isConnected]);

  return {
    signIn,
    isAuthenticating,
    showSuccess,
    authSuccess,
    canSignIn: isConnected && !!address && !!chainId && sessionStatus === 'unauthenticated'
  };
}
