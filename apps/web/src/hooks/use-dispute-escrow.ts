"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import { ESCROW_CONTRACT_ABI } from "@/lib/escrow-config";
import { hashDocument } from "@/lib/hash";
import type { DisputeParams, DisputeDocument } from "@/lib/types";

/**
 * Hook to raise a dispute on an escrow
 *
 * - Type-safe dispute submission
 * - Automatic document storage
 * - Cache invalidation
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
      // Wait a moment for blockchain state to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Invalidate and refetch ALL queries related to this escrow
      // Use exact same query key structure as useEscrowDetails hook

      // 1. Invalidate the main escrow details query
      await queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(variables.escrowAddress),
        exact: false, // Match all queries that start with this key
      });

      // 2. Invalidate the dispute info query
      await queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.escrows.detail(variables.escrowAddress),
          "dispute",
        ],
      });

      // 3. Invalidate document queries (for the dispute document)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(variables.escrowAddress),
      });

      // Also invalidate with the dispute hash as key
      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(data.disputeHash),
      });

      // 4. Invalidate ALL readContract queries to catch any wagmi cached reads
      await queryClient.invalidateQueries({
        queryKey: ["readContract"],
      });

      // 5. Force refetch all queries for this escrow address
      await queryClient.refetchQueries({
        queryKey: queryKeys.escrows.detail(variables.escrowAddress),
        exact: false,
        type: 'active',
      });

      // 6. Also refetch document queries
      await queryClient.refetchQueries({
        queryKey: queryKeys.documents.detail(variables.escrowAddress),
      });

      console.log("Cache invalidated and refetched after dispute for escrow:", variables.escrowAddress);

      // Call the optional onSuccess callback
      if (options?.onSuccess) {
        await options.onSuccess(data, variables);
      }
    },

    onError: (error) => {
      console.error("Dispute error:", error);

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
