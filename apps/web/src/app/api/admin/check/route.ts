import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS;

// Tell Next.js this route must be dynamic (server-rendered on demand)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/check
 * Check if the current user is an admin
 * Returns { isAdmin: boolean } without throwing errors
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Not authenticated
    if (!session?.user?.address) {
      console.log("[Admin Check] No session or address found");
      return NextResponse.json({ isAdmin: false });
    }

    // No admin address configured
    if (!ADMIN_WALLET_ADDRESS) {
      console.warn("[Admin Check] ADMIN_WALLET_ADDRESS not configured in environment");
      return NextResponse.json({ isAdmin: false });
    }

    const userAddress = session.user.address.toLowerCase();
    const adminAddress = ADMIN_WALLET_ADDRESS.toLowerCase();

    console.log("[Admin Check] User address:", userAddress);
    console.log("[Admin Check] Admin address:", adminAddress);
    console.log("[Admin Check] Is admin:", userAddress === adminAddress);

    const isAdmin = userAddress === adminAddress;

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("[Admin Check] Error:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
