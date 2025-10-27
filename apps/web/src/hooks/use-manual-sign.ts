import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useSession } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { getCsrfToken, signIn as nextAuthSignIn } from 'next-auth/react';

export function useManualSign() {
  const { address, isConnected, chainId } = useAccount();
  const { status: sessionStatus } = useSession();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
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
        disconnect();
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
        disconnect();
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      // Disconnect wallet when user cancels signature
      disconnect();
    } finally {
      setIsAuthenticating(false);
      isAuthenticatingRef.current = false;
    }
  }, [address, chainId, isConnected, signMessageAsync, disconnect]);

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
