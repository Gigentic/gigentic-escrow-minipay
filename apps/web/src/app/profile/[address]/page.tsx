"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useSession } from "next-auth/react";
import { useChainModal } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressDisplay } from "@/components/wallet/address-display";
import { VerificationBadge, VerificationIcon } from "@/components/profile/verification-badge";
import { ProfileModal } from "@/components/profile/profile-modal";
import { useProfile } from "@/hooks/use-profile";
import { Loader2, UserCircle, Network } from "lucide-react";
import { type Address } from "viem";
import {
  getMasterFactoryAddress,
  MASTER_FACTORY_ABI,
} from "@/lib/escrow-config";

export default function ProfilePage({ params }: { params: { address: string } }) {
  const profileAddress = params.address as Address;
  const { address: currentUserAddress, chain, chainId } = useAccount();
  const { openChainModal } = useChainModal();
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch profile data
  const { profile, isLoading: isLoadingProfile } = useProfile(profileAddress);

  // Check if viewing own profile
  const isOwnProfile =
    currentUserAddress &&
    currentUserAddress.toLowerCase() === profileAddress.toLowerCase();

  // Fetch user's escrow addresses
  const { data: userEscrowAddresses, isLoading: isLoadingEscrows } = useReadContract({
    address: chainId ? getMasterFactoryAddress(chainId) : undefined,
    abi: MASTER_FACTORY_ABI,
    functionName: "getUserEscrows",
    args: [profileAddress],
    query: {
      enabled: !!chainId,
    },
  });

  // Calculate stats from escrow addresses (simplified - just counts)
  const totalEscrows = userEscrowAddresses?.length || 0;

  // For now, we'll show simplified stats
  // To get completed count, we'd need to fetch each escrow's state (done in dashboard)
  // For profile page, we keep it simple with just total count

  if (isLoadingProfile) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <Card className="p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <UserCircle className="h-16 w-16 text-muted-foreground" />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">
                  {profile?.name || "Anonymous User"}
                </h1>
                {profile?.isVerified && (
                  <VerificationIcon
                    isVerified={profile.isVerified}
                    className="h-5 w-5"
                  />
                )}
              </div>

              {/* Wallet Address */}
              <div className="mb-3">
                <AddressDisplay
                  address={profileAddress}
                  showCopy={true}
                  showExplorer={true}
                />
              </div>

              {/* Bio */}
              {profile?.bio && (
                <p className="text-muted-foreground mb-3">{profile.bio}</p>
              )}

              {/* Action Buttons (only for own profile) */}
              {isOwnProfile && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                  >
                    Edit Profile
                  </Button>
                  {openChainModal && (
                    <Button
                      onClick={openChainModal}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      title="Switch Network"
                    >
                      <Network className="h-4 w-4" />
                      <span>{chain?.name || 'Network'}</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Escrows</p>
                <p className="text-3xl font-bold">{totalEscrows}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="text-lg font-medium">
                  {profile?.updatedAt
                    ? new Date(profile.updatedAt).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Empty state for new users */}
        {totalEscrows === 0 && (
          <Card className="p-8 text-center mt-6">
            <p className="text-muted-foreground mb-4">
              {isOwnProfile
                ? "You haven't created any escrows yet."
                : "This user hasn't created any escrows yet."}
            </p>
            {isOwnProfile && (
              <Button asChild>
                <a href="/create">Create Your First Escrow</a>
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Profile Edit Modal */}
      <ProfileModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        address={profileAddress}
      />
    </main>
  );
}
