"use client";

import { useState, useEffect } from 'react';
import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/use-profile";
import { useAuthState } from "@/components/wallet-provider";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile-modal";
import { Loader2 } from "lucide-react";

export function ConnectButton() {
  const { chain, address } = useAccount();
  const { status: sessionStatus } = useSession();
  const { profile } = useProfile(address);
  const { isAuthenticating, signIn } = useAuthState();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isMiniPay, setIsMiniPay] = useState(false);

  const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "prod";
  const isAuthenticated = sessionStatus === 'authenticated';

  // Detect MiniPay environment
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum?.isMiniPay) {
      setIsMiniPay(true);
    }
  }, []);

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
                  // In MiniPay, show "Connecting..." since auto-connect is happening
                  if (isMiniPay) {
                    return (
                      <Button type="button" disabled variant="outline" className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting...</span>
                      </Button>
                    );
                  }

                  return (
                    <Button onClick={openConnectModal} type="button">
                      Connect Wallet
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

                // Show "Signing in..." while authenticating
                if (isAuthenticating) {
                  return (
                    <Button type="button" disabled variant="outline" className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </Button>
                  );
                }

                // Show profile button only when authenticated
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

                // Connected but not authenticated: show Sign In button
                return (
                  <Button onClick={signIn} type="button" variant="default">
                    Sign In
                  </Button>
                );
              })()}
            </div>
          );
        }}
      </RainbowKitConnectButton.Custom>
    </div>
  );
}