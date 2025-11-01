import type { Address } from "viem";

/**
 * Compare two Ethereum addresses for equality (case-insensitive)
 * @param a First address
 * @param b Second address
 * @returns True if addresses are equal (case-insensitive)
 */
export function addressesEqual(a?: Address, b?: Address): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Check if user is the depositor of an escrow
 * @param userAddress User's wallet address
 * @param escrow Escrow object with depositor field
 * @returns True if user is the depositor
 */
export function isDepositor(
  userAddress?: Address,
  escrow?: { depositor: Address }
): boolean {
  if (!userAddress || !escrow) return false;
  return addressesEqual(userAddress, escrow.depositor);
}

/**
 * Check if user is the recipient of an escrow
 * @param userAddress User's wallet address
 * @param escrow Escrow object with recipient field
 * @returns True if user is the recipient
 */
export function isRecipient(
  userAddress?: Address,
  escrow?: { recipient: Address }
): boolean {
  if (!userAddress || !escrow) return false;
  return addressesEqual(userAddress, escrow.recipient);
}

/**
 * Check if user is a party (depositor or recipient) to an escrow
 * @param userAddress User's wallet address
 * @param escrow Escrow object with depositor and recipient fields
 * @returns True if user is either depositor or recipient
 */
export function isParty(
  userAddress?: Address,
  escrow?: { depositor: Address; recipient: Address }
): boolean {
  if (!userAddress || !escrow) return false;
  return isDepositor(userAddress, escrow) || isRecipient(userAddress, escrow);
}

/**
 * Get user's role in an escrow
 * @param userAddress User's wallet address
 * @param escrow Escrow object with depositor and recipient fields
 * @returns User's role: 'depositor', 'recipient', or 'other'
 */
export function getUserRole(
  userAddress?: Address,
  escrow?: { depositor: Address; recipient: Address }
): "depositor" | "recipient" | "other" {
  if (!userAddress || !escrow) return "other";
  if (isDepositor(userAddress, escrow)) return "depositor";
  if (isRecipient(userAddress, escrow)) return "recipient";
  return "other";
}
