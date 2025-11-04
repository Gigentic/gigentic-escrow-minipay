import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Address } from "viem";

export interface AuthenticatedSession {
  address: Address;
  isAdmin: boolean;
}

/**
 * Get authenticated user from server-side session
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedSession | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.address) {
    return null;
  }

  const address = session.user.address as Address;

  // Use server-only environment variable (no NEXT_PUBLIC_ prefix)
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();

  const isAdmin = adminAddress ? address.toLowerCase() === adminAddress : false;

  return {
    address,
    isAdmin,
  };
}

/**
 * Require authentication, throw error if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedSession> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

/**
 * Require admin authentication, throw error if not admin
 */
export async function requireAdmin(): Promise<AuthenticatedSession> {
  const user = await requireAuth();

  if (!user.isAdmin) {
    console.warn("[Admin Auth] Access denied for user:", user.address);
    throw new Error("FORBIDDEN");
  }

  console.log("[Admin Auth] Access granted for admin:", user.address);
  return user;
}

/**
 * Check if authenticated user can access escrow data
 * User must be either depositor, recipient, or admin
 */
export async function requireEscrowAccess(
  depositor: Address,
  recipient: Address
): Promise<AuthenticatedSession> {
  const user = await requireAuth();

  const hasAccess =
    user.isAdmin ||
    user.address.toLowerCase() === depositor.toLowerCase() ||
    user.address.toLowerCase() === recipient.toLowerCase();

  if (!hasAccess) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
