"use client";

import { useQueries } from "@tanstack/react-query";
import { usePublicClient, useAccount } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import { ESCROW_CONTRACT_ABI } from "@/lib/escrow-config";
import type { EscrowListItem } from "@/lib/types";

/**
 * Hook to fetch details for multiple user escrows in parallel
 *
 * This hook replaces the sequential Promise.all fetching in dashboard/page.tsx (lines 40-91)
 * with parallel queries that provide progressive loading and automatic caching.
 *
 * BEFORE (Promise.all):
 * - Fetch all escrows together with Promise.all
 * - Wait for ALL to complete before showing ANY results
 * - Manual loading state management
 * - Duplicate fetch logic for deliverables
 * Result: Slow initial render, all-or-nothing loading
 *
 * AFTER (useQueries):
 * - Each escrow query runs independently
 * - Progressive rendering as each completes
 * - Automatic caching and request deduplication
 * - Reuses existing query keys
 * Result: Faster perceived performance, better UX
 *
 * @param addresses - Array of escrow contract addresses to fetch
 * @returns Array of escrow list items with loading state
 */
export function useUserEscrows(addresses: readonly Address[] | Address[] | undefined) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const queries = useQueries({
    queries: (addresses || []).map((escrowAddress) => ({
      queryKey: [...queryKeys.escrows.detail(escrowAddress), "listItem"],
      queryFn: async (): Promise<EscrowListItem | null> => {
        if (!publicClient) return null;

        try {
          // Fetch escrow details from contract
          const details = await publicClient.readContract({
            address: escrowAddress,
            abi: ESCROW_CONTRACT_ABI,
            functionName: "getDetails",
          });

          // Fetch deliverable title (optional - don't fail if missing)
          let title: string | undefined;
          if (chainId) {
            try {
              const docResponse = await fetch(`/api/documents/${escrowAddress}?chainId=${chainId}`);
              if (docResponse.ok) {
                const docData = await docResponse.json();
                title = docData.document?.title;
              }
            } catch (err) {
              // Deliverable is optional - continue without it
              console.error(`Error fetching deliverable for ${escrowAddress}:`, err);
            }
          }

          return {
            address: escrowAddress,
            depositor: details[0] as Address,
            recipient: details[1] as Address,
            amount: details[2] as bigint,
            state: details[5] as number,
            createdAt: details[7] as bigint,
            title,
          };
        } catch (error) {
          console.error(`Error fetching escrow ${escrowAddress}:`, error);
          return null;
        }
      },
      enabled: !!publicClient && !!escrowAddress && !!chainId,
      staleTime: 5_000, // Fresh for only 5 seconds to ensure more frequent updates
      retry: 1, // Only retry once on failure
      refetchOnMount: true, // Refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window gains focus
    })),
  });

  // Filter out null and undefined results and extract data
  const escrows = queries
    .map((q) => q.data)
    .filter((escrow): escrow is EscrowListItem => !!escrow);

  // Loading if ANY query is still loading
  const isLoading = queries.some((q) => q.isLoading);

  // Error if ANY query has an error
  const error = queries.find((q) => q.error)?.error || null;

  return {
    escrows,
    isLoading,
    error,
  };
}
