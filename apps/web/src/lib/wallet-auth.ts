import { type Address } from "viem";

/**
 * Wallet Authentication Utilities
 */

/**
 * Check if an address is the admin (CLIENT-SIDE ONLY - UI DISPLAY PURPOSES)
 *
 * ⚠️ WARNING: This function is NOT secure and should ONLY be used for UI hints.
 * For actual authorization, use server-side functions in lib/server-auth.ts
 *
 * @param address - Address to check
 * @returns true if address is admin, false otherwise
 */
export function isAdmin(address: Address): boolean {
  const adminAddress = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS?.toLowerCase();
  if (!adminAddress) {
    console.error("NEXT_PUBLIC_ADMIN_WALLET_ADDRESS not configured");
    return false;
  }
  return address.toLowerCase() === adminAddress;
}

/**
 * Generate a message for the user to sign
 * This creates a standardized message format for authentication
 *
 * @param action - The action being performed (e.g., "store-document", "resolve-dispute")
 * @param timestamp - Current timestamp in milliseconds
 * @returns Message string to be signed
 */
export function generateAuthMessage(action: string, timestamp: number): string {
  return `Gigentic Escrow Authentication\n\nAction: ${action}\nTimestamp: ${timestamp}\n\nSign this message to authenticate your request.`;
}

