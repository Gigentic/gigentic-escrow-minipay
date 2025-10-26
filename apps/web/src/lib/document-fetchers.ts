import type { Address } from "viem";
import type {
  DisputeDocument,
  ResolutionDocument,
  DeliverableDocument,
  DocumentResponse,
} from "@/lib/types";

/**
 * Centralized document fetching helpers
 *
 * All documents are stored off-chain in KV for gas efficiency.
 * On-chain we only store bytes32 hashes:
 * - deliverableHash: keccak256(deliverable JSON)
 * - disputeReasonHash: keccak256(dispute JSON)
 * - resolutionHash: keccak256(resolution JSON)
 *
 * This file eliminates duplicate hash→cleartext fetching logic across the app.
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

/**
 * Fetch resolution document by hash
 * @param hash - The resolution hash from contract
 * @returns Resolution document with admin's decision details
 * @throws Error if fetch fails or document not found
 */
export async function fetchResolutionDocument(
  hash: `0x${string}`
): Promise<ResolutionDocument> {
  const response = await fetch(`/api/documents/${hash}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch resolution document: ${hash} (status: ${response.status})`
    );
  }

  const data: DocumentResponse<ResolutionDocument> = await response.json();
  return data.document;
}

/**
 * Fetch deliverable document by escrow address
 *
 * Note: Deliverables are keyed by escrowAddress (not hash) in KV
 * This is because the deliverableHash doesn't exist yet when you need to fetch it
 *
 * @param escrowAddress - The escrow contract address
 * @returns Deliverable document or null if not found
 * @throws Error if fetch fails (but returns null for 404)
 */
export async function fetchDeliverableDocument(
  escrowAddress: Address
): Promise<DeliverableDocument | null> {
  const response = await fetch(`/api/documents/${escrowAddress}`);

  // 404 is expected if document doesn't exist yet
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch deliverable document: ${escrowAddress} (status: ${response.status})`
    );
  }

  const data: DocumentResponse<DeliverableDocument> = await response.json();
  return data.document;
}
