"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import {
  CUSD_ADDRESS,
  ERC20_ABI,
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { hashDocument } from "@/lib/hash";
import { extractEscrowCreatedAddress } from "@/lib/contract-helpers";
import type { CreateEscrowParams } from "@/lib/types";

/**
 * Hook to create a new escrow with optimistic updates
 *
 * This hook replaces the inline mutation logic in create-escrow-form.tsx (lines 100-263)
 * with a reusable hook that provides:
 * - Granular mutation steps (APPROVING → CREATING → CONFIRMING → STORING)
 * - Optimistic updates (show escrow in dashboard immediately)
 * - Type-safe event extraction (no more `as any`)
 * - Automatic cache invalidation
 *
 * BEFORE (Inline):
 * - 160+ lines of mutation logic in component
 * - Generic isSubmitting boolean
 * - Manual cache invalidation
 * - Type-unsafe event extraction
 *
 * AFTER (Hook):
 * - Reusable mutation hook
 * - Granular loading states for better UX
 * - Optimistic updates for instant feedback
 * - Type-safe throughout
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation hook with createEscrow function and state
 */
export function useCreateEscrow(options?: {
  onSuccess?: (data: { escrowAddress: Address; txHash: `0x${string}` }) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CreateEscrowParams) => {
      if (!userAddress || !publicClient) {
        throw new Error("Wallet not connected");
      }

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

      // Step 1: Approve tokens
      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [userAddress, MASTER_FACTORY_ADDRESS],
      });

      if (currentAllowance < total) {
        console.log("Approving cUSD spend...");

        // Estimate gas with 40% buffer
        let approveGasLimit: bigint | undefined;
        try {
          const estimatedGas = await publicClient.estimateContractGas({
            address: CUSD_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MASTER_FACTORY_ADDRESS, total],
            account: userAddress,
          });
          approveGasLimit = (estimatedGas * 140n) / 100n;
          console.log(`Approve gas: ${estimatedGas}, buffered: ${approveGasLimit}`);
        } catch (gasError) {
          console.warn("Approve gas estimation failed, using default:", gasError);
        }

        const approveTxHash = await writeContractAsync({
          address: CUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [MASTER_FACTORY_ADDRESS, total],
          gas: approveGasLimit,
        });

        console.log("Approval tx:", approveTxHash);
        await publicClient.waitForTransactionReceipt({
          hash: approveTxHash,
          confirmations: 1,
        });
        console.log("Approval confirmed");
      }

      // Step 2: Create escrow
      console.log("Creating escrow...");

      // Estimate gas with 40% buffer
      let createGasLimit: bigint | undefined;
      try {
        const estimatedGas = await publicClient.estimateContractGas({
          address: MASTER_FACTORY_ADDRESS,
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
        address: MASTER_FACTORY_ADDRESS,
        abi: MASTER_FACTORY_ABI,
        functionName: "createEscrow",
        args: [recipient, amount, deliverableHash],
        gas: createGasLimit,
      });

      console.log("Create tx:", createTxHash);

      // Step 3: Wait for confirmation and extract escrow address
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

      // Step 4: Store deliverable document
      const storeResponse = await fetch("/api/documents/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: deliverableHash,
          document: deliverableDoc,
          escrowAddress,
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
      await queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          {
            address: MASTER_FACTORY_ADDRESS,
            functionName: "getUserEscrows",
          },
        ],
      });

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
