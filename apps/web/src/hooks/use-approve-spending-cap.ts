"use client";

import { useMutation } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  CUSD_ADDRESS,
  ERC20_ABI,
  MASTER_FACTORY_ADDRESS,
} from "@/lib/escrow-config";

/**
 * Hook to approve spending cap for the escrow contract
 *
 * This hook handles the ERC-20 token approval transaction separately
 * from escrow creation, giving users explicit control over the spending cap.
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation hook with approveSpendingCap function and state
 */
export function useApproveSpendingCap(options?: {
  onSuccess?: (txHash: `0x${string}`) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async (amount: bigint) => {
      if (!userAddress || !publicClient) {
        throw new Error("Wallet not connected");
      }

      console.log("Approving spending cap for:", amount.toString());

      // Estimate gas with 40% buffer
      let approveGasLimit: bigint | undefined;
      try {
        const estimatedGas = await publicClient.estimateContractGas({
          address: CUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [MASTER_FACTORY_ADDRESS, amount],
          account: userAddress,
        });
        approveGasLimit = (estimatedGas * 140n) / 100n;
        console.log(`Approve gas: ${estimatedGas}, buffered: ${approveGasLimit}`);
      } catch (gasError) {
        console.warn("Approve gas estimation failed, using default:", gasError);
      }

      // Execute approval transaction
      const approveTxHash = await writeContractAsync({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [MASTER_FACTORY_ADDRESS, amount],
        gas: approveGasLimit,
      });

      console.log("Approval tx:", approveTxHash);

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({
        hash: approveTxHash,
        confirmations: 1,
      });

      console.log("Spending cap approved successfully");

      return approveTxHash;
    },

    onSuccess: async (txHash) => {
      console.log("Spending cap approval confirmed:", txHash);

      // Call the optional onSuccess callback
      if (options?.onSuccess) {
        await options.onSuccess(txHash);
      }
    },

    onError: (error) => {
      console.error("Spending cap approval error:", error);

      // Call the optional onError callback
      if (options?.onError) {
        options.onError(error);
      }
    },
  });

  return {
    approveSpendingCap: mutation.mutate,
    approveSpendingCapAsync: mutation.mutateAsync,
    isApproving: mutation.isPending,
    error: mutation.error,
    txHash: mutation.data,
    reset: mutation.reset,
  };
}
