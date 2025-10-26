"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import {
  ESCROW_CONTRACT_ABI,
  MASTER_FACTORY_ADDRESS,
} from "@/lib/escrow-config";
import { hashDocument } from "@/lib/hash";
import type { DisputeParams, DisputeDocument } from "@/lib/types";

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
 * @returns Mutation hook with raiseDispute function and state
 */
export function useDisputeEscrow() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
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

    onSuccess: (data, variables) => {
      // Invalidate escrow details query
      queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(variables.escrowAddress),
      });

      // Invalidate user escrows list (state changed)
      queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          publicClient?.chain?.id,
          MASTER_FACTORY_ADDRESS,
          "getUserEscrows",
        ],
      });

      console.log("Cache invalidated after dispute");
    },

    onError: (error) => {
      console.error("Dispute error:", error);
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
