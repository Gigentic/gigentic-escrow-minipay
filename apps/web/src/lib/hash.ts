import { keccak256, toBytes, toHex } from "viem";

/**
 * Document Hashing Utilities
 * Used for generating and verifying hashes of deliverable and resolution documents
 */

export interface Hashable {
  [key: string]: any;
}

/**
 * Generate a keccak256 hash of a JSON object
 * Used for creating deliverable and resolution hashes
 * 
 * @param data - Object to hash (will be stringified with sorted keys for consistency)
 * @returns hex string hash with 0x prefix
 */
export function hashDocument(data: Hashable): `0x${string}` {
  // Sort keys for deterministic hashing
  const sortedData = sortKeys(data);
  const jsonString = JSON.stringify(sortedData);
  const hash = keccak256(toBytes(jsonString));
  return hash;
}

/**
 * Verify that a document matches its hash
 * 
 * @param data - Document to verify
 * @param expectedHash - Expected hash value
 * @returns true if hash matches, false otherwise
 */
export function verifyDocumentHash(data: Hashable, expectedHash: `0x${string}`): boolean {
  const computedHash = hashDocument(data);
  return computedHash === expectedHash;
}

/**
 * Sort object keys recursively for deterministic JSON serialization
 * 
 * @param obj - Object to sort
 * @returns Object with sorted keys
 */
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }

  const sorted: Record<string, any> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = sortKeys(obj[key]);
    });

  return sorted;
}

/**
 * Convert a hex hash to a shortened display format
 * Example: 0x1234...5678
 * 
 * @param hash - Full hash string
 * @param prefixLength - Number of characters to show at start (default: 6)
 * @param suffixLength - Number of characters to show at end (default: 4)
 * @returns Shortened hash string
 */
export function shortenHash(
  hash: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (hash.length <= prefixLength + suffixLength) {
    return hash;
  }

  const prefix = hash.slice(0, prefixLength);
  const suffix = hash.slice(-suffixLength);
  return `${prefix}...${suffix}`;
}

