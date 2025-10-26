"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { queryKeys } from "@/lib/queries";
import type { DeliverableDocument, DocumentResponse } from "@/lib/types";

/**
 * Hook to fetch deliverable document from KV store
 *
 * This hook centralizes the deliverable fetching logic that was duplicated across:
 * - dashboard/page.tsx (line 58-68)
 * - escrow/[address]/page.tsx (line 56-64)
 * - admin/disputes/[id]/page.tsx
 *
 * Benefits:
 * - Single source of truth for deliverable fetching
 * - Automatic caching and request deduplication
 * - Consistent error handling
 * - Type-safe response
 *
 * @param escrowAddress - The escrow contract address (used as KV key)
 * @returns Query result with deliverable data, loading state, and error
 */
export function useDeliverableDocument(escrowAddress: Address | undefined) {
  return useQuery({
    queryKey: queryKeys.documents.detail(escrowAddress || ""),
    queryFn: async () => {
      if (!escrowAddress) return null;

      const response = await fetch(`/api/documents/${escrowAddress}`);

      // 404 is expected for escrows without deliverables
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch deliverable document");
      }

      const data: DocumentResponse<DeliverableDocument> = await response.json();
      return data.document;
    },
    enabled: !!escrowAddress,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
  });
}
