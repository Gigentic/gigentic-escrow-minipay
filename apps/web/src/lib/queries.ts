import type { Address } from "viem";

/**
 * Centralized query key factory for TanStack Query
 *
 * This follows TanStack Query best practices for query key management:
 * - Hierarchical structure for easy invalidation
 * - Type-safe keys with `as const`
 * - Single source of truth for all query keys
 *
 * Benefits:
 * - Automatic request deduplication (same key = same request)
 * - Easy to invalidate related queries
 * - Consistent key structure across the app
 */

export interface EscrowFilters {
  role?: "all" | "depositor" | "recipient";
  state?: number | "all";
}

export const queryKeys = {
  // Escrow queries
  escrows: {
    all: ["escrows"] as const,
    lists: () => [...queryKeys.escrows.all, "list"] as const,
    list: (filters?: EscrowFilters) =>
      [...queryKeys.escrows.lists(), filters] as const,
    details: () => [...queryKeys.escrows.all, "detail"] as const,
    detail: (address: Address) =>
      [...queryKeys.escrows.details(), address] as const,
  },

  // Document queries (deliverables, disputes, resolutions)
  documents: {
    all: ["documents"] as const,
    detail: (hashOrAddress: string, chainId?: number) =>
      [...queryKeys.documents.all, hashOrAddress, chainId] as const,
  },

  // Contract read queries (for wagmi integration)
  contracts: {
    all: ["readContract"] as const,
    read: (
      chainId: number,
      address: Address,
      functionName: string,
      args?: readonly unknown[]
    ) =>
      [
        ...queryKeys.contracts.all,
        chainId,
        address,
        functionName,
        ...(args || []),
      ] as const,
  },

  // Admin queries
  admin: {
    all: ["admin"] as const,
    disputes: () => [...queryKeys.admin.all, "disputes"] as const,
    stats: () => [...queryKeys.admin.all, "stats"] as const,
  },

  // Profile queries
  profiles: {
    all: ["profiles"] as const,
    detail: (address: Address) =>
      [...queryKeys.profiles.all, address] as const,
  },
};
