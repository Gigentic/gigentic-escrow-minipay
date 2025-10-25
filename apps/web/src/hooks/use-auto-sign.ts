import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useSession } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { getCsrfToken, signIn } from 'next-auth/react';

export function useAutoSign() {
  const { address, isConnected, chainId } = useAccount();
  const { status: sessionStatus } = useSession();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const hasTriggeredRef = useRef(false);
  const previousConnectedRef = useRef(false);

  useEffect(() => {
    // Only trigger auth when wallet connection CHANGES from false to true
    // This prevents auto-auth on page refresh when wallet reconnects from storage
    const isNewConnection = isConnected && !previousConnectedRef.current;
    previousConnectedRef.current = isConnected;

    const shouldAuthenticate =
      isNewConnection &&  // Only on fresh connections, not reconnections
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

        // Small delay to ensure wallet extension is ready
        await new Promise(resolve => setTimeout(resolve, 300));

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
          // Disconnect wallet on authentication failure
          disconnect();
        }
      } catch (error) {
        console.error('Auto-sign error:', error);
        // Disconnect wallet when user cancels signature
        disconnect();
      } finally {
        setIsAuthenticating(false);
      }
    };

    authenticate();
  }, [address, isConnected, chainId, sessionStatus, isAuthenticating, signMessageAsync, disconnect]);

  // Reset trigger when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasTriggeredRef.current = false;
      previousConnectedRef.current = false;
      setShowSuccess(false);
    }
  }, [isConnected]);

  return { isAuthenticating, showSuccess };
}
