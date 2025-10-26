"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import {
  ESCROW_CONTRACT_ABI,
  MASTER_FACTORY_ADDRESS,
} from "@/lib/escrow-config";

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
 * @returns Mutation hook with completeEscrow function and state
 */
export function useCompleteEscrow() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (escrowAddress: Address) => {
      // Call escrow.complete()
      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "complete",
      });

      console.log("Complete tx:", txHash);

      return { txHash };
    },

    onSuccess: (data, escrowAddress) => {
      // Invalidate escrow details query
      queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(escrowAddress),
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

      console.log("Cache invalidated after completion");
    },

    onError: (error) => {
      console.error("Complete escrow error:", error);
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
