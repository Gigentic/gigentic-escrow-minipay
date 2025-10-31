"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import {
  ESCROW_CONTRACT_ABI,
  type EscrowDetails,
} from "@/lib/escrow-config";
import type {
  DeliverableDocument,
  DocumentResponse,
  ResolutionDocument,
} from "@/lib/types";
import { fetchDisputeDocument } from "@/lib/document-fetchers";

/**
 * Helper function to parse escrow details from contract response
 */
function parseEscrowDetails(details: readonly unknown[]): EscrowDetails {
  return {
    depositor: details[0] as Address,
    recipient: details[1] as Address,
    escrowAmount: details[2] as bigint,
    platformFee: details[3] as bigint,
    disputeBond: details[4] as bigint,
    state: details[5] as number,
    deliverableHash: details[6] as `0x${string}`,
    createdAt: details[7] as bigint,
  };
}

/**
 * Helper function to parse and fetch dispute information
 * Now properly typed with wagmi's auto-generated types from ABI
 */
async function parseDisputeInfo(
  disputeData: readonly [`0x${string}`, `0x${string}`]
): Promise<{
  disputeReason: string;
  disputeReasonHash: `0x${string}`;
  resolutionHash?: `0x${string}`;
} | null> {
  const [disputeReasonHash, resolutionHash] = disputeData; // Auto-typed by wagmi!

  const ZERO_HASH =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

  // No dispute if hash is zero
  if (!disputeReasonHash || disputeReasonHash === ZERO_HASH) {
    return null;
  }

  // Fetch cleartext from KV using centralized helper
  const disputeDoc = await fetchDisputeDocument(disputeReasonHash);

  return {
    disputeReason: disputeDoc.reason,
    disputeReasonHash,
    resolutionHash: resolutionHash !== ZERO_HASH ? resolutionHash : undefined,
  };
}

/**
 * Hook to fetch all escrow details with parallel queries
 *
 * - Fetch all 3 queries in parallel
 * - Single state update when all complete
 *
 * @param escrowAddress - The escrow contract address
 * @returns Combined escrow data with loading and error states
 */
export function useEscrowDetails(escrowAddress: Address | undefined) {
  const publicClient = usePublicClient();

  // Fetch escrow details, deliverable, and dispute info in parallel
  const queries = useQueries({
    queries: [
      // Query 1: Escrow details from contract
      {
        queryKey: queryKeys.escrows.detail(escrowAddress || ("" as Address)),
        queryFn: async () => {
          if (!publicClient || !escrowAddress) return null;

          const details = await publicClient.readContract({
            address: escrowAddress,
            abi: ESCROW_CONTRACT_ABI,
            functionName: "getDetails",
          });

          return parseEscrowDetails(details);
        },
        enabled: !!publicClient && !!escrowAddress,
        staleTime: 5_000, // Fresh for 5 seconds for more responsive updates
        refetchOnMount: true,
        refetchOnWindowFocus: true,
      },

      // Query 2: Deliverable document from API
      {
        queryKey: queryKeys.documents.detail(escrowAddress || ""),
        queryFn: async () => {
          if (!escrowAddress) return null;

          const response = await fetch(`/api/documents/${escrowAddress}`);
          if (!response.ok) return null;

          const data: DocumentResponse<DeliverableDocument> =
            await response.json();
          return data.document;
        },
        enabled: !!escrowAddress,
        staleTime: 5 * 60_000, // Fresh for 5 minutes (documents are immutable)
      },

      // Query 3: Dispute info from contract
      {
        queryKey: [
          ...queryKeys.escrows.detail(escrowAddress || ("" as Address)),
          "dispute",
        ],
        queryFn: async () => {
          if (!publicClient || !escrowAddress) return null;

          const disputeData = await publicClient.readContract({
            address: escrowAddress,
            abi: ESCROW_CONTRACT_ABI,
            functionName: "getDisputeInfo",
          });

          return parseDisputeInfo(disputeData);
        },
        enabled: !!publicClient && !!escrowAddress,
        staleTime: 5_000, // Fresh for 5 seconds for more responsive updates
        refetchOnMount: true,
        refetchOnWindowFocus: true,
      },
    ],
  });

  // Query 4: Resolution document (separate query to avoid circular dependency)
  // Only fetch if dispute query has returned a resolution hash
  const resolutionHash = queries[2]?.data?.resolutionHash;
  const resolutionQuery = useQuery({
    queryKey: [
      ...queryKeys.escrows.detail(escrowAddress || ("" as Address)),
      "resolution",
      resolutionHash,
    ],
    queryFn: async () => {
      if (!resolutionHash) return null;

      const response = await fetch(`/api/documents/${resolutionHash}`);
      if (!response.ok) return null;

      const data: DocumentResponse<ResolutionDocument> =
        await response.json();
      return data.document;
    },
    enabled: !!resolutionHash && !queries[2].isLoading,
    staleTime: 5 * 60_000,
  });

  // Refetch function to manually trigger all queries to refresh
  const refetchAll = async () => {
    console.log("Refetching all escrow details...");
    await Promise.all([
      ...queries.map(q => q.refetch()),
      resolutionQuery.refetch(),
    ]);
  };

  return {
    details: queries[0].data || null,
    deliverable: queries[1].data || null,
    disputeInfo: queries[2].data || null,
    resolution: resolutionQuery.data || null,
    isLoading: queries.some((q: { isLoading: boolean }) => q.isLoading) || resolutionQuery.isLoading,
    error: queries.find((q: { error: unknown }) => q.error)?.error || resolutionQuery.error || null,
    refetchAll,
  };
}
