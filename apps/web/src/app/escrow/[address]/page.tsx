"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { type Address, formatUnits } from "viem";
import { useAccount } from "wagmi";
import { EscrowDetailsDisplay } from "@/components/escrow/escrow-details";
import { EscrowActions } from "@/components/escrow/escrow-actions";
import { EscrowSuccessModal } from "@/components/escrow/escrow-success-modal";
import { useEscrowDetails } from "@/hooks/use-escrow-details";
import { isParty as checkIsParty } from "@/lib/address-utils";
import { getStablecoinDecimals } from "@/lib/escrow-config";

export default function EscrowDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const escrowAddress = params.address as Address;
  const { address: userAddress, isConnected, chainId } = useAccount();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Use the hook for parallel data fetching
  const { details, deliverable, disputeInfo, resolution, isLoading, error, refetchAll } =
    useEscrowDetails(escrowAddress);

  // Check for success query parameter
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true" && details) {
      setShowSuccessModal(true);
    }
  }, [searchParams, details]);

  // Check if current user is a party to this escrow
  const isParty = details ? checkIsParty(userAddress, details) : false;

  if (isLoading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading escrow details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : "Failed to load escrow"}
          </p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Escrow not found</p>
        </div>
      </main>
    );
  }

  // Format amount for success modal
  const decimals = chainId ? getStablecoinDecimals(chainId) : 18;
  const formattedAmount = formatUnits(details.escrowAmount, decimals);

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-4">
        <EscrowDetailsDisplay
          escrowAddress={escrowAddress}
          details={details}
          deliverable={deliverable || undefined}
          disputeInfo={disputeInfo || undefined}
          resolution={resolution || undefined}
          isParty={isParty}
          isConnected={isConnected}
          userAddress={userAddress}
          chainId={chainId}
        />

        <EscrowActions
          escrowAddress={escrowAddress}
          depositor={details.depositor}
          recipient={details.recipient}
          state={details.state}
          onActionComplete={refetchAll}
        />
      </div>

      {/* Success Modal */}
      <EscrowSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        escrowAddress={escrowAddress}
        amount={formattedAmount}
        chainId={chainId}
      />
    </main>
  );
}

