import type { QueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { queryKeys } from "./queries";
import type { EscrowListItem } from "./types";

/**
 * Cache utility functions for event-based cache updates
 *
 * These functions provide granular cache updates instead of broad invalidation,
 * reducing unnecessary blockchain reads and improving performance.
 */

/**
 * Add a newly created escrow to the user's escrow list cache
 * Called when EscrowCreated event is detected
 */
export function addEscrowToUserCache(
  queryClient: QueryClient,
  _userAddress: Address,
  newEscrow: EscrowListItem
) {
  // Update the wagmi readContract cache for getUserEscrows
  // This is where the escrow addresses array is cached

  // Get all queries that match the getUserEscrows pattern
  const queries = queryClient.getQueriesData({
    queryKey: ["readContract"],
    exact: false
  });

  // Find the specific getUserEscrows query for this user
  for (const [key, data] of queries) {
    const keyArray = key as unknown[];
    if (
      Array.isArray(keyArray) &&
      keyArray.length >= 2 &&
      typeof keyArray[1] === "object" &&
      keyArray[1] !== null &&
      "functionName" in keyArray[1] &&
      keyArray[1].functionName === "getUserEscrows"
    ) {
      // This is a getUserEscrows query, update it
      const currentAddresses = (data as Address[] | undefined) || [];

      // Only add if not already present
      if (!currentAddresses.includes(newEscrow.address)) {
        queryClient.setQueryData(key, [...currentAddresses, newEscrow.address]);
        console.log(`[Cache] Added escrow ${newEscrow.address} to getUserEscrows cache`);
      }
    }
  }

  // Also add the escrow detail to cache so it appears immediately
  const detailQueryKey = [...queryKeys.escrows.detail(newEscrow.address), "listItem"];
  queryClient.setQueryData(detailQueryKey, newEscrow);
  console.log(`[Cache] Added escrow details to cache for ${newEscrow.address}`);
}

/**
 * Update an escrow's state in the cache
 * Called when EscrowCompleted, EscrowRefunded, or DisputeRaised events are detected
 */
export function updateEscrowStateInCache(
  queryClient: QueryClient,
  escrowAddress: Address,
  newState: number
) {
  // Find and update the escrow list item cache
  const detailQueryKey = [...queryKeys.escrows.detail(escrowAddress), "listItem"];
  const currentData = queryClient.getQueryData<EscrowListItem>(detailQueryKey);

  if (currentData) {
    queryClient.setQueryData<EscrowListItem>(detailQueryKey, {
      ...currentData,
      state: newState,
    });
    console.log(`[Cache] Updated escrow ${escrowAddress} state to ${newState}`);
  }

  // Invalidate the full escrow details to refetch all data (including dispute info)
  // This is necessary because state changes may include additional data
  queryClient.invalidateQueries({
    queryKey: queryKeys.escrows.detail(escrowAddress),
    exact: false,
  });
}

/**
 * Mark an escrow as having a dispute raised
 * Called when DisputeRaised event is detected
 */
export function markEscrowDisputed(
  queryClient: QueryClient,
  escrowAddress: Address
) {
  // State 1 = DISPUTED (from EscrowState enum)
  updateEscrowStateInCache(queryClient, escrowAddress, 1);

  // Invalidate dispute-related queries to fetch the dispute details
  queryClient.invalidateQueries({
    queryKey: [...queryKeys.escrows.detail(escrowAddress), "dispute"],
  });
}

/**
 * Mark an escrow as completed
 * Called when EscrowCompleted event is detected
 */
export function markEscrowCompleted(
  queryClient: QueryClient,
  escrowAddress: Address
) {
  // State 2 = COMPLETED (from EscrowState enum)
  updateEscrowStateInCache(queryClient, escrowAddress, 2);
}

/**
 * Mark an escrow as refunded
 * Called when EscrowRefunded event is detected
 */
export function markEscrowRefunded(
  queryClient: QueryClient,
  escrowAddress: Address
) {
  // State 3 = REFUNDED (from EscrowState enum)
  updateEscrowStateInCache(queryClient, escrowAddress, 3);
}
