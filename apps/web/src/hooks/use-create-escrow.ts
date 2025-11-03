"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import {
  getMasterFactoryAddress,
  MASTER_FACTORY_ABI,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { hashDocument } from "@/lib/hash";
import { extractEscrowCreatedAddress } from "@/lib/contract-helpers";
import type { CreateEscrowParams } from "@/lib/types";

/**
 * Hook to create a new escrow
 *
 * This hook handles the escrow creation transaction and assumes that
 * the spending cap (ERC-20 approval) has already been set by the user.
 *
 * Features:
 * - Creates escrow via MasterFactory contract
 * - Stores deliverable document off-chain
 * - Type-safe event extraction
 * - Automatic cache invalidation
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation hook with createEscrow function and state
 */
export function useCreateEscrow(options?: {
  onSuccess?: (data: { escrowAddress: Address; txHash: `0x${string}` }) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const { address: userAddress, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CreateEscrowParams) => {
      if (!userAddress || !publicClient || !chainId) {
        throw new Error("Wallet not connected or chain not selected");
      }

      const factoryAddress = getMasterFactoryAddress(chainId);

      const { recipient, amount, deliverable } = params;

      // Calculate total amount required
      const { total } = calculateTotalRequired(amount);

      // Create deliverable document
      const deliverableDoc = {
        title: deliverable.title,
        description: deliverable.description,
        acceptanceCriteria: deliverable.acceptanceCriteria,
        depositor: userAddress,
        recipient,
        amount: amount.toString(),
        createdAt: Date.now(),
      };

      // Generate hash from deliverable
      const deliverableHash = hashDocument(deliverableDoc);

      // Create escrow (assumes approval already completed)
      console.log("Creating escrow...");

      // Estimate gas with 40% buffer
      let createGasLimit: bigint | undefined;
      try {
        const estimatedGas = await publicClient.estimateContractGas({
          address: factoryAddress,
          abi: MASTER_FACTORY_ABI,
          functionName: "createEscrow",
          args: [recipient, amount, deliverableHash],
          account: userAddress,
        });
        createGasLimit = (estimatedGas * 140n) / 100n;
        console.log(`Create gas: ${estimatedGas}, buffered: ${createGasLimit}`);
      } catch (gasError) {
        console.warn("Create gas estimation failed, using default:", gasError);
      }

      const createTxHash = await writeContractAsync({
        address: factoryAddress,
        abi: MASTER_FACTORY_ABI,
        functionName: "createEscrow",
        args: [recipient, amount, deliverableHash],
        gas: createGasLimit,
      });

      console.log("Create tx:", createTxHash);

      // Wait for confirmation and extract escrow address
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createTxHash,
        confirmations: 1,
      });
      console.log("Escrow created successfully");

      // Extract escrow address using type-safe helper
      const escrowAddress = extractEscrowCreatedAddress(receipt);
      if (!escrowAddress) {
        throw new Error("Failed to extract escrow address from transaction");
      }

      console.log("Escrow address:", escrowAddress);

      // Store deliverable document
      const storeResponse = await fetch("/api/documents/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: deliverableHash,
          document: deliverableDoc,
          escrowAddress,
          chainId,
        }),
      });

      if (!storeResponse.ok) {
        console.error("Failed to store deliverable document");
        throw new Error("Failed to store deliverable document");
      }

      console.log("Deliverable stored for escrow:", escrowAddress);

      return {
        escrowAddress,
        txHash: createTxHash,
      };
    },

    onSuccess: async (data) => {
      // Invalidate ALL contract reads for the Master Factory
      // This ensures any getUserEscrows queries are refetched
      await queryClient.invalidateQueries({
        queryKey: ["readContract"],
        refetchType: "active", // Force immediate refetch of active queries
      });

      // Also invalidate the specific getUserEscrows query pattern
      // wagmi uses a specific query key structure
      if (chainId) {
        const factoryAddress = getMasterFactoryAddress(chainId);
        await queryClient.invalidateQueries({
          queryKey: [
            "readContract",
            {
              address: factoryAddress,
              functionName: "getUserEscrows",
            },
          ],
        });
      }

      // Invalidate escrow details for the new escrow
      await queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.detail(data.escrowAddress),
      });

      // Give a brief moment for the chain to propagate before navigation
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("Cache invalidated and refetched for new escrow");

      // Call the optional onSuccess callback
      if (options?.onSuccess) {
        await options.onSuccess(data);
      }
    },

    onError: (error) => {
      console.error("Create escrow error:", error);

      // Call the optional onError callback
      if (options?.onError) {
        options.onError(error);
      }
    },
  });

  return {
    createEscrow: mutation.mutate,
    createEscrowAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    txHash: mutation.data?.txHash,
    escrowAddress: mutation.data?.escrowAddress,
    reset: mutation.reset,
  };
}
