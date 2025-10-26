"use client";

import { useParams } from "next/navigation";
import { type Address } from "viem";
import { EscrowDetailsDisplay } from "@/components/escrow/escrow-details";
import { EscrowActions } from "@/components/escrow/escrow-actions";
import { useEscrowDetails } from "@/hooks/use-escrow-details";

export default function EscrowDetailPage() {
  const params = useParams();
  const escrowAddress = params.address as Address;

  // Use the hook for parallel data fetching
  const { details, deliverable, disputeInfo, resolution, isLoading, error } =
    useEscrowDetails(escrowAddress);

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

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <EscrowDetailsDisplay
          escrowAddress={escrowAddress}
          details={details}
          deliverable={deliverable || undefined}
          disputeInfo={disputeInfo || undefined}
          resolution={resolution || undefined}
        />

        <EscrowActions
          escrowAddress={escrowAddress}
          depositor={details.depositor}
          recipient={details.recipient}
          state={details.state}
        />
      </div>
    </main>
  );
}

