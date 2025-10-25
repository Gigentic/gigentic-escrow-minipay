import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { getCsrfToken, signIn, signOut } from 'next-auth/react';

export function createCustomAuthAdapter() {
  return createAuthenticationAdapter({
    getNonce: async () => {
      const nonce = await getCsrfToken();
      return nonce ?? '';
    },

    createMessage: ({ nonce, address, chainId }) => {
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to Gigentic Escrow',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });
      return message.prepareMessage();
    },

    verify: async ({ message, signature }) => {
      try {
        const response = await signIn('credentials', {
          message,
          signature,
          redirect: false,
        });

        return Boolean(response?.ok);
      } catch (error) {
        console.error('Authentication verification error:', error);
        return false;
      }
    },

    signOut: async () => {
      await signOut({ redirect: false });
    },
  });
}
