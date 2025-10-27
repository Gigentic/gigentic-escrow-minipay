"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import { ESCROW_CONTRACT_ABI } from "@/lib/escrow-config";
import { hashDocument } from "@/lib/hash";
import type { DisputeParams, DisputeDocument, EscrowListItem } from "@/lib/types";

/**
 * Hook to raise a dispute on an escrow
 *
 * This hook replaces the inline dispute logic in escrow-actions.tsx (lines 93-165)
 * with a reusable hook that provides:
 * - Type-safe dispute submission
 * - Automatic document storage
 * - Cache invalidation
 *
 * BEFORE (Inline):
 * - Dispute logic embedded in component
 * - Manual state management
 * - Manual cache invalidation
 *
 * AFTER (Hook):
 * - Reusable mutation hook
 * - Automatic error handling
 * - Consistent cache updates
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation hook with raiseDispute function and state
 */
export function useDisputeEscrow(options?: {
  onSuccess?: (data: { txHash: `0x${string}`; disputeHash: `0x${string}` }, params: DisputeParams) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // Optimistic update: Show disputed state immediately
    onMutate: async (params: DisputeParams) => {
      console.log("[Optimistic] Marking escrow as disputed");

      // Get current escrow data
      const detailQueryKey = [...queryKeys.escrows.detail(params.escrowAddress), "listItem"];
      const previousEscrow = queryClient.getQueryData<EscrowListItem>(detailQueryKey);

      // Optimistically update to DISPUTED state (1)
      if (previousEscrow) {
        queryClient.setQueryData<EscrowListItem>(detailQueryKey, {
          ...previousEscrow,
          state: 1, // DISPUTED
        });
      }

      // Return context with previous value for rollback
      return { previousEscrow };
    },

    mutationFn: async (params: DisputeParams) => {
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      if (!publicClient) {
        throw new Error("Public client not available");
      }

      const { escrowAddress, reason } = params;

      if (!reason.trim()) {
        throw new Error("Please provide a reason for the dispute");
      }

      // Step 1: Create dispute document
      const disputeDoc: DisputeDocument = {
        escrowAddress,
        raiser: userAddress,
        reason: reason.trim(),
        raisedAt: Date.now(),
      };

      // Step 2: Generate hash
      const disputeHash = hashDocument(disputeDoc);

      // Step 3: Store dispute document in KV
      const storeResponse = await fetch("/api/documents/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: disputeHash,
          document: disputeDoc,
        }),
      });

      if (!storeResponse.ok) {
        throw new Error("Failed to store dispute document");
      }

      console.log("Dispute document stored with hash:", disputeHash);

      // Step 4: Send hash to blockchain
      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "dispute",
        args: [disputeHash],
      });

      console.log("Dispute tx:", txHash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("Dispute tx confirmed:", receipt.status);

      return { txHash, disputeHash, receipt };
    },

    onSuccess: async (data, variables) => {
      console.log("[Optimistic] Transaction confirmed, dispute raised");

      // The event listener will handle the final cache update
      // But we'll invalidate to ensure all related data is fresh
      await queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(variables.escrowAddress),
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(variables.escrowAddress),
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(data.disputeHash),
      });

      console.log("[Optimistic] Cache invalidated after dispute for escrow:", variables.escrowAddress);

      // Call the optional onSuccess callback
      if (options?.onSuccess) {
        await options.onSuccess(data, variables);
      }
    },

    onError: (error, variables, context) => {
      console.error("[Optimistic] Transaction failed, rolling back");
      console.error("Dispute error:", error);

      // Rollback: Restore previous state
      if (context?.previousEscrow) {
        const detailQueryKey = [...queryKeys.escrows.detail(variables.escrowAddress), "listItem"];
        queryClient.setQueryData(detailQueryKey, context.previousEscrow);
        console.log("[Optimistic] Rollback complete");
      }

      // Call the optional onError callback
      if (options?.onError) {
        options.onError(error);
      }
    },
  });

  return {
    raiseDispute: mutation.mutate,
    raiseDisputeAsync: mutation.mutateAsync,
    isRaisingDispute: mutation.isPending,
    error: mutation.error,
    txHash: mutation.data?.txHash,
    reset: mutation.reset,
  };
}
