"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePublicClient } from "wagmi";
import { type Address } from "viem";
import { EscrowDetailsDisplay } from "@/components/escrow/escrow-details";
import { EscrowActions } from "@/components/escrow/escrow-actions";
import {
  ESCROW_CONTRACT_ABI,
  type EscrowDetails,
  type DeliverableDocument,
  type ResolutionDocument,
} from "@/lib/escrow-config";

export default function EscrowDetailPage() {
  const params = useParams();
  const publicClient = usePublicClient();
  const escrowAddress = params.address as Address;

  const [details, setDetails] = useState<EscrowDetails | null>(null);
  const [deliverable, setDeliverable] = useState<DeliverableDocument | null>(null);
  const [disputeInfo, setDisputeInfo] = useState<{ disputeReason: string; resolutionHash?: string } | null>(null);
  const [resolution, setResolution] = useState<ResolutionDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEscrowData = async () => {
    if (!publicClient || !escrowAddress) return;

    setIsLoading(true);
    setError("");

    try {
      // Fetch escrow details
      const escrowDetails = await publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "getDetails",
      });

      const parsedDetails: EscrowDetails = {
        depositor: escrowDetails[0],
        recipient: escrowDetails[1],
        escrowAmount: escrowDetails[2],
        platformFee: escrowDetails[3],
        disputeBond: escrowDetails[4],
        state: escrowDetails[5],
        deliverableHash: escrowDetails[6],
        createdAt: escrowDetails[7],
      };

      setDetails(parsedDetails);

      // Fetch deliverable document from API using escrow address
      try {
        const docResponse = await fetch(`/api/documents/${escrowAddress}`);
        if (docResponse.ok) {
          const docData = await docResponse.json();
          setDeliverable(docData.document);
        }
      } catch (err) {
        console.error("Error fetching deliverable:", err);
      }

      // Fetch dispute info if disputed or resolved
      try {
        const disputeData = await publicClient.readContract({
          address: escrowAddress,
          abi: ESCROW_CONTRACT_ABI,
          functionName: "getDisputeInfo",
        });

        // disputeData[0] is now a hash (hex string) instead of cleartext
        const disputeReasonHash = disputeData[0];
        const resolutionHash = disputeData[1];

        if (disputeReasonHash && disputeReasonHash !== "" && disputeReasonHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          // Fetch actual dispute text from KV
          let actualDisputeReason = disputeReasonHash; // Fallback to hash if fetch fails

          try {
            const disputeDocResponse = await fetch(`/api/documents/${disputeReasonHash}`);
            if (disputeDocResponse.ok) {
              const disputeDocData = await disputeDocResponse.json();
              actualDisputeReason = disputeDocData.document.reason;
            }
          } catch (err) {
            console.error("Error fetching dispute document from KV:", err);
            // Keep fallback value (the hash itself)
          }

          setDisputeInfo({
            disputeReason: actualDisputeReason,
            resolutionHash: resolutionHash,
          });

          // Fetch resolution document if resolution hash exists
          if (resolutionHash && resolutionHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            try {
              const resolutionDocResponse = await fetch(`/api/documents/${resolutionHash}`);
              if (resolutionDocResponse.ok) {
                const resolutionDocData = await resolutionDocResponse.json();
                setResolution(resolutionDocData.document);
              }
            } catch (err) {
              console.error("Error fetching resolution document from KV:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching dispute info:", err);
      }
    } catch (err: any) {
      console.error("Error fetching escrow data:", err);
      setError("Failed to load escrow details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrowData();
  }, [escrowAddress, publicClient]);

  if (isLoading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading escrow details...</p>
        </div>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            {error || "Escrow not found"}
          </p>
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
          onSuccess={fetchEscrowData}
        />
      </div>
    </main>
  );
}

