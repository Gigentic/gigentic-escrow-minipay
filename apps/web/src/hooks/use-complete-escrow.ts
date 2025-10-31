"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import { ESCROW_CONTRACT_ABI } from "@/lib/escrow-config";

/**
 * Hook to complete an escrow (release funds to recipient)
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation hook with completeEscrow function and state
 */
export function useCompleteEscrow(options?: {
  onSuccess?: (data: { txHash: `0x${string}` }, escrowAddress: Address) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (escrowAddress: Address) => {
      if (!publicClient) throw new Error("Public client not available");

      // Call escrow.complete()
      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "complete",
      });

      console.log("Complete tx:", txHash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("Complete tx confirmed:", receipt.status);

      return { txHash, receipt };
    },

    onSuccess: async (data, escrowAddress) => {
      // Wait a moment for blockchain state to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Invalidate and refetch ALL queries related to this escrow
      // Use exact same query key structure as useEscrowDetails hook

      // 1. Invalidate the main escrow details query
      await queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(escrowAddress),
        exact: false, // Match all queries that start with this key
      });

      // 2. Invalidate the dispute info query
      await queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.escrows.detail(escrowAddress),
          "dispute",
        ],
      });

      // 3. Invalidate document queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(escrowAddress),
      });

      // 4. Invalidate ALL readContract queries to catch any wagmi cached reads
      await queryClient.invalidateQueries({
        queryKey: ["readContract"],
      });

      // 5. Force refetch all queries for this escrow address
      await queryClient.refetchQueries({
        queryKey: queryKeys.escrows.detail(escrowAddress),
        exact: false,
        type: 'active',
      });

      // 6. Also refetch document queries
      await queryClient.refetchQueries({
        queryKey: queryKeys.documents.detail(escrowAddress),
      });

      console.log("Cache invalidated and refetched after completion for escrow:", escrowAddress);

      // Call the optional onSuccess callback
      if (options?.onSuccess) {
        await options.onSuccess(data, escrowAddress);
      }
    },

    onError: (error) => {
      console.error("Complete escrow error:", error);

      // Call the optional onError callback
      if (options?.onError) {
        options.onError(error);
      }
    },
  });

  return {
    completeEscrow: mutation.mutate,
    completeEscrowAsync: mutation.mutateAsync,
    isCompleting: mutation.isPending,
    error: mutation.error,
    txHash: mutation.data?.txHash,
    reset: mutation.reset,
  };
}
