"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import type { Address } from "viem";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  ESCROW_CONTRACT_ABI,
} from "@/lib/escrow-config";
import {
  addEscrowToUserCache,
  markEscrowCompleted,
  markEscrowRefunded,
  markEscrowDisputed,
} from "@/lib/cache-utils";
import type { EscrowListItem } from "@/lib/types";

/**
 * Hook to listen for blockchain events and update the query cache in real-time
 *
 * This hook provides event-based cache updates instead of polling or manual refetching:
 * - Listens to EscrowCreated events from MasterFactory
 * - Listens to state change events from all user escrows
 * - Automatically updates cache when events are detected
 *
 * Benefits:
 * - Real-time UI updates without polling
 * - Reduced blockchain reads (no constant refetching)
 * - Better UX with instant feedback
 * - Lower API usage and costs
 *
 * @param userEscrowAddresses - Array of escrow addresses owned by user
 */
export function useEscrowEvents(userEscrowAddresses?: readonly Address[] | Address[]) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  // ============================================================================
  // 1. Listen to EscrowCreated events from MasterFactory
  // ============================================================================
  useWatchContractEvent({
    address: MASTER_FACTORY_ADDRESS,
    abi: MASTER_FACTORY_ABI,
    eventName: "EscrowCreated",
    onLogs: async (logs) => {
      if (!userAddress || !publicClient) return;

      for (const log of logs) {
        const { escrowAddress, depositor, recipient, amount } = log.args;

        // Only handle events where the connected user is involved
        const isUserInvolved =
          depositor?.toLowerCase() === userAddress.toLowerCase() ||
          recipient?.toLowerCase() === userAddress.toLowerCase();

        if (!isUserInvolved || !escrowAddress) continue;

        console.log(`[Events] EscrowCreated detected: ${escrowAddress}`);

        // Fetch the creation timestamp from the contract
        let createdAt: bigint;
        try {
          createdAt = (await publicClient.readContract({
            address: escrowAddress,
            abi: ESCROW_CONTRACT_ABI,
            functionName: "createdAt",
          })) as bigint;
        } catch (error) {
          console.error("Failed to fetch createdAt:", error);
          createdAt = BigInt(Math.floor(Date.now() / 1000)); // Fallback to current time
        }

        // Try to fetch deliverable title (optional)
        let title: string | undefined;
        try {
          const docResponse = await fetch(`/api/documents/${escrowAddress}`);
          if (docResponse.ok) {
            const docData = await docResponse.json();
            title = docData.document?.title;
          }
        } catch (err) {
          // Deliverable might not be stored yet, that's ok
          console.log(`[Events] Deliverable not yet available for ${escrowAddress}`);
        }

        // Create escrow list item for cache
        const newEscrow: EscrowListItem = {
          address: escrowAddress as Address,
          depositor: depositor as Address,
          recipient: recipient as Address,
          amount: amount as bigint,
          state: 0, // CREATED
          createdAt,
          title,
        };

        // Add to cache
        addEscrowToUserCache(queryClient, userAddress, newEscrow);
      }
    },
    // Only listen when user is connected
    enabled: !!userAddress,
  });

  // ============================================================================
  // 2. Listen to events from user's escrow contracts
  // ============================================================================

  // Listen to EscrowCompleted events from all user escrows
  useEffect(() => {
    if (!userEscrowAddresses || userEscrowAddresses.length === 0 || !publicClient) {
      return;
    }

    const unwatch = publicClient.watchContractEvent({
      address: userEscrowAddresses as Address[],
      abi: ESCROW_CONTRACT_ABI,
      eventName: "EscrowCompleted",
      onLogs: (logs) => {
        for (const log of logs) {
          const escrowAddress = log.address;
          console.log(`[Events] EscrowCompleted detected: ${escrowAddress}`);
          markEscrowCompleted(queryClient, escrowAddress);
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [userEscrowAddresses, publicClient, queryClient]);

  // Listen to EscrowRefunded events from all user escrows
  useEffect(() => {
    if (!userEscrowAddresses || userEscrowAddresses.length === 0 || !publicClient) {
      return;
    }

    const unwatch = publicClient.watchContractEvent({
      address: userEscrowAddresses as Address[],
      abi: ESCROW_CONTRACT_ABI,
      eventName: "EscrowRefunded",
      onLogs: (logs) => {
        for (const log of logs) {
          const escrowAddress = log.address;
          console.log(`[Events] EscrowRefunded detected: ${escrowAddress}`);
          markEscrowRefunded(queryClient, escrowAddress);
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [userEscrowAddresses, publicClient, queryClient]);

  // Listen to DisputeRaised events from all user escrows
  useEffect(() => {
    if (!userEscrowAddresses || userEscrowAddresses.length === 0 || !publicClient) {
      return;
    }

    const unwatch = publicClient.watchContractEvent({
      address: userEscrowAddresses as Address[],
      abi: ESCROW_CONTRACT_ABI,
      eventName: "DisputeRaised",
      onLogs: (logs) => {
        for (const log of logs) {
          const escrowAddress = log.address;
          console.log(`[Events] DisputeRaised detected: ${escrowAddress}`);
          markEscrowDisputed(queryClient, escrowAddress);
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [userEscrowAddresses, publicClient, queryClient]);

  // Listen to DisputeResolved events from all user escrows
  useEffect(() => {
    if (!userEscrowAddresses || userEscrowAddresses.length === 0 || !publicClient) {
      return;
    }

    const unwatch = publicClient.watchContractEvent({
      address: userEscrowAddresses as Address[],
      abi: ESCROW_CONTRACT_ABI,
      eventName: "DisputeResolved",
      onLogs: (logs) => {
        for (const log of logs) {
          const escrowAddress = log.address;
          const { favorDepositor } = log.args;

          console.log(`[Events] DisputeResolved detected: ${escrowAddress}, favorDepositor: ${favorDepositor}`);

          // Update to COMPLETED (2) or REFUNDED (3) based on resolution
          if (favorDepositor) {
            markEscrowRefunded(queryClient, escrowAddress);
          } else {
            markEscrowCompleted(queryClient, escrowAddress);
          }
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [userEscrowAddresses, publicClient, queryClient]);
}
