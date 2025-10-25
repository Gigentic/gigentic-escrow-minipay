"use client";

import { useState } from 'react';
import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useSession, getCsrfToken, signIn } from "next-auth/react";
import { SiweMessage } from 'siwe';
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile-modal";
import { Loader2 } from "lucide-react";

export function ConnectButton() {
  const { chain, address, chainId } = useAccount();
  const { status: sessionStatus } = useSession();
  const { profile } = useProfile(address);
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "prod";
  const isAuthenticated = sessionStatus === 'authenticated';

  const handleSignIn = async () => {
    if (!address || !chainId) return;

    try {
      setIsSigningIn(true);

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
      } else {
        console.error('Authentication failed:', result?.error);
      }
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isDev && chain && (
        <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
          {chain.name}
        </div>
      )}

      <RainbowKitConnectButton.Custom>
        {({
          account,
          chain,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <Button onClick={openConnectModal} type="button">
                      Login / Register
                    </Button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <Button onClick={openChainModal} type="button" variant="destructive">
                      Wrong network
                    </Button>
                  );
                }

                // Show profile button when authenticated
                if (isAuthenticated) {
                  return (
                    <>
                      <Button
                        onClick={() => setProfileModalOpen(true)}
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {account.ensAvatar && (
                          <img
                            alt={account.ensName ?? 'Account avatar'}
                            src={account.ensAvatar}
                            className="h-6 w-6 rounded-full"
                          />
                        )}
                        <span>
                          {profile?.name || account.displayName}
                        </span>
                      </Button>

                      {address && (
                        <ProfileModal
                          open={profileModalOpen}
                          onOpenChange={setProfileModalOpen}
                          address={address}
                        />
                      )}
                    </>
                  );
                }

                // Connected but not authenticated - show Connected status + Sign In button
                return (
                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => disconnect()} variant="outline">
                      Disconnect
                    </Button>
                    <Button
                      onClick={handleSignIn}
                      type="button"
                      disabled={isSigningIn}
                      className="flex items-center gap-2"
                    >
                      {isSigningIn && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>{isSigningIn ? 'Signing in...' : 'Sign In'}</span>
                    </Button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </RainbowKitConnectButton.Custom>
    </div>
  );
}