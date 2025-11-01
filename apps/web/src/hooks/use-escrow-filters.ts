import { useState, useMemo } from "react";
import type { Address } from "viem";
import { EscrowState } from "@/lib/escrow-config";
import { isDepositor, isRecipient } from "@/lib/address-utils";
import type { EscrowListItem } from "@/lib/types";

export type RoleFilter = "all" | "depositor" | "recipient";
export type StateFilterOption = EscrowState | "all";
export type SortOrder = "newest" | "oldest";

/**
 * Hook to manage escrow filtering and sorting logic
 * Extracts business logic from dashboard component for reusability and testability
 *
 * @param escrows Array of escrow items to filter and sort
 * @param userAddress Current user's wallet address
 * @returns Filtered escrows and filter state management
 */
export function useEscrowFilters(
  escrows: EscrowListItem[],
  userAddress?: Address
) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilterOption>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  /**
   * Filter and sort escrows based on current filter state
   * Memoized to prevent unnecessary recalculations
   */
  const filteredEscrows = useMemo(() => {
    return escrows
      .filter((escrow) => {
        // Role filter
        if (filter === "depositor" && !isDepositor(userAddress, escrow)) {
          return false;
        }
        if (filter === "recipient" && !isRecipient(userAddress, escrow)) {
          return false;
        }

        // State filter
        if (stateFilter !== "all" && escrow.state !== stateFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by createdAt timestamp
        const aTime = Number(a.createdAt);
        const bTime = Number(b.createdAt);

        if (sortOrder === "newest") {
          return bTime - aTime; // Newest first (descending)
        } else {
          return aTime - bTime; // Oldest first (ascending)
        }
      });
  }, [escrows, filter, stateFilter, sortOrder, userAddress]);

  /**
   * Check if any non-default filters are active
   */
  const hasActiveFilters = filter !== "all" || stateFilter !== "all";

  return {
    // Filtered data
    filteredEscrows,
    hasActiveFilters,

    // Role filter
    filter,
    setFilter,

    // State filter
    stateFilter,
    setStateFilter,

    // Sort order
    sortOrder,
    setSortOrder,
  };
}
