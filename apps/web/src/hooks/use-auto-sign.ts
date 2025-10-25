import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { getCsrfToken, signIn } from 'next-auth/react';

export function useAutoSign() {
  const { address, isConnected, chainId } = useAccount();
  const { status: sessionStatus } = useSession();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const shouldAuthenticate =
      isConnected &&
      address &&
      chainId &&
      sessionStatus === 'unauthenticated' &&
      !isAuthenticating &&
      !hasTriggeredRef.current;

    if (!shouldAuthenticate) {
      return;
    }

    const authenticate = async () => {
      try {
        setIsAuthenticating(true);
        hasTriggeredRef.current = true;

        // Get nonce
        const nonce = await getCsrfToken();
        if (!nonce) {
          console.error('Failed to get CSRF token');
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
        const result = await signIn('credentials', {
          message: preparedMessage,
          signature,
          redirect: false,
        });

        if (result?.ok) {
          console.log('Authentication successful');
          // Show success state briefly
          setShowSuccess(true);
          // Auto-close after 500ms
          setTimeout(() => {
            setShowSuccess(false);
          }, 500);
        } else {
          console.error('Authentication failed:', result?.error);
          // Don't retry automatically - user must reconnect wallet
        }
      } catch (error) {
        console.error('Auto-sign error:', error);
        // Don't retry automatically - user can try again by reconnecting
      } finally {
        setIsAuthenticating(false);
      }
    };

    authenticate();
  }, [address, isConnected, chainId, sessionStatus, isAuthenticating, signMessageAsync]);

  // Reset trigger when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasTriggeredRef.current = false;
      setShowSuccess(false);
    }
  }, [isConnected]);

  return { isAuthenticating, showSuccess };
}
