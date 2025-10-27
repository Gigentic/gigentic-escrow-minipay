import type {
  DisputeDocument,
  DocumentResponse,
} from "@/lib/types";

/**
 * Centralized document fetching helpers for client-side code
 *
 * All documents are stored off-chain in KV for gas efficiency.
 * On-chain we only store bytes32 hashes.
 */

/**
 * Fetch dispute document by hash
 * @param hash - The dispute reason hash from contract
 * @returns Dispute document with cleartext reason
 * @throws Error if fetch fails or document not found
 */
export async function fetchDisputeDocument(
  hash: `0x${string}`
): Promise<DisputeDocument> {
  const response = await fetch(`/api/documents/${hash}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch dispute document: ${hash} (status: ${response.status})`
    );
  }

  const data: DocumentResponse<DisputeDocument> = await response.json();
  return data.document;
}

