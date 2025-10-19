import { verifyMessage, type Address } from "viem";

/**
 * Wallet Authentication Utilities
 * Used for verifying wallet signatures in API routes
 */

export interface SignaturePayload {
  address: Address;
  message: string;
  signature: `0x${string}`;
  timestamp: number;
}

/**
 * Verify a wallet signature
 * Used in API routes to authenticate requests
 * 
 * @param payload - Signature payload containing address, message, signature, and timestamp
 * @returns true if signature is valid and not expired, false otherwise
 */
export async function verifyWalletSignature(payload: SignaturePayload): Promise<boolean> {
  try {
    const { address, message, signature, timestamp } = payload;

    // Check if timestamp is recent (within 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - timestamp > fiveMinutes) {
      console.error("Signature timestamp expired");
      return false;
    }

    // Verify the signature matches the address
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });

    return isValid;
  } catch (error) {
    console.error("Error verifying wallet signature:", error);
    return false;
  }
}

/**
 * Extract and verify wallet signature from request headers
 * Expected headers:
 * - x-wallet-address: The wallet address
 * - x-wallet-signature: The signature
 * - x-wallet-message: The message that was signed
 * - x-wallet-timestamp: The timestamp when the message was signed
 * 
 * @param request - Next.js Request object
 * @returns Address if signature is valid, null otherwise
 */
export async function authenticateRequest(request: Request): Promise<Address | null> {
  try {
    const address = request.headers.get("x-wallet-address") as Address | null;
    const signature = request.headers.get("x-wallet-signature") as `0x${string}` | null;
    const message = request.headers.get("x-wallet-message");
    const timestampStr = request.headers.get("x-wallet-timestamp");

    if (!address || !signature || !message || !timestampStr) {
      console.error("Missing authentication headers");
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      console.error("Invalid timestamp");
      return null;
    }

    const isValid = await verifyWalletSignature({
      address,
      message,
      signature,
      timestamp,
    });

    return isValid ? address : null;
  } catch (error) {
    console.error("Error authenticating request:", error);
    return null;
  }
}

/**
 * Check if an address is the admin
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

