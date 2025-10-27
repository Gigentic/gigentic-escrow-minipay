"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import { ESCROW_CONTRACT_ABI } from "@/lib/escrow-config";
import type { EscrowListItem } from "@/lib/types";

/**
 * Hook to complete an escrow (release funds to recipient)
 *
 * This hook replaces the inline complete logic in escrow-actions.tsx (lines 53-90)
 * with a reusable hook that provides:
 * - Type-safe escrow completion
 * - Automatic cache invalidation
 * - Better error handling
 *
 * BEFORE (Inline):
 * - Complete logic embedded in component
 * - Manual state management
 * - Manual cache invalidation
 *
 * AFTER (Hook):
 * - Reusable mutation hook
 * - Automatic error handling
 * - Consistent cache updates
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
    // Optimistic update: Show completed state immediately
    onMutate: async (escrowAddress: Address) => {
      console.log("[Optimistic] Marking escrow as completed");

      // Get current escrow data
      const detailQueryKey = [...queryKeys.escrows.detail(escrowAddress), "listItem"];
      const previousEscrow = queryClient.getQueryData<EscrowListItem>(detailQueryKey);

      // Optimistically update to COMPLETED state (2)
      if (previousEscrow) {
        queryClient.setQueryData<EscrowListItem>(detailQueryKey, {
          ...previousEscrow,
          state: 2, // COMPLETED
        });
      }

      // Return context with previous value for rollback
      return { previousEscrow };
    },

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
      console.log("[Optimistic] Transaction confirmed, escrow completed");

      // The event listener will handle the final cache update
      // But we'll invalidate to ensure all related data is fresh
      await queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(escrowAddress),
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(escrowAddress),
      });

      console.log("[Optimistic] Cache invalidated after completion for escrow:", escrowAddress);

      // Call the optional onSuccess callback
      if (options?.onSuccess) {
        await options.onSuccess(data, escrowAddress);
      }
    },

    onError: (error, escrowAddress, context) => {
      console.error("[Optimistic] Transaction failed, rolling back");
      console.error("Complete escrow error:", error);

      // Rollback: Restore previous state
      if (context?.previousEscrow) {
        const detailQueryKey = [...queryKeys.escrows.detail(escrowAddress), "listItem"];
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
    completeEscrow: mutation.mutate,
    completeEscrowAsync: mutation.mutateAsync,
    isCompleting: mutation.isPending,
    error: mutation.error,
    txHash: mutation.data?.txHash,
    reset: mutation.reset,
  };
}
