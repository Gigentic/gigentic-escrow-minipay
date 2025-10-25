"use client";

import { useState } from 'react';
import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile-modal";

export function ConnectButton() {
  const { chain, address } = useAccount();
  const { profile } = useProfile(address);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "prod";

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