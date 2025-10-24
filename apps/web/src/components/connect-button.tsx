"use client";

import { useState, useEffect } from 'react';
import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile-modal";

// Detect if running in MiniPay environment
function isMiniPayEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-ignore - MiniPay adds this property to window.ethereum
  return !!window.ethereum?.isMiniPay;
}

export function ConnectButton() {
  const { chain, address } = useAccount();
  const { profile } = useProfile(address);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isMiniPay, setIsMiniPay] = useState(false);

  // const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "prod";
  const isDev = true;

  // Check for MiniPay environment on mount
  useEffect(() => {
    setIsMiniPay(isMiniPayEnvironment());
  }, []);

  return (
    <div className="flex items-center gap-3">
      {isDev && chain && (
        <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
          {chain.name}
          {isMiniPay && " • MiniPay"}
        </div>
      )}

      <RainbowKitConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

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
              })()}
            </div>
          );
        }}
      </RainbowKitConnectButton.Custom>
    </div>
  );
}