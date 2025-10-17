import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { celoSepolia } from "viem/chains";
import { isAdmin } from "@/lib/wallet-auth";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  ESCROW_CONTRACT_ABI,
  EscrowState,
} from "@/lib/escrow-config";

/**
 * GET /api/admin/stats
 * Get platform-wide statistics
 * Requires admin wallet address in header
 */
export async function GET(request: Request) {
  try {
    // Check admin authorization
    const adminAddress = request.headers.get("x-wallet-address") as Address | null;
    if (!adminAddress || !isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Create public client
    const publicClient = createPublicClient({
      chain: celoSepolia,
      transport: http(),
    });

    // Get factory statistics
    const factoryStats = await publicClient.readContract({
      address: MASTER_FACTORY_ADDRESS,
      abi: MASTER_FACTORY_ABI,
      functionName: "getStatistics",
    });

    // Get all escrows
    const allEscrows = await publicClient.readContract({
      address: MASTER_FACTORY_ADDRESS,
      abi: MASTER_FACTORY_ABI,
      functionName: "getAllEscrows",
    });

    // Count escrows by state
    let createdCount = 0;
    let disputedCount = 0;
    let completedCount = 0;
    let refundedCount = 0;

    for (const escrowAddress of allEscrows) {
      try {
        const details = await publicClient.readContract({
          address: escrowAddress as Address,
          abi: ESCROW_CONTRACT_ABI,
          functionName: "getDetails",
        });

        const state = details[5] as EscrowState;

        switch (state) {
          case EscrowState.CREATED:
            createdCount++;
            break;
          case EscrowState.DISPUTED:
            disputedCount++;
            break;
          case EscrowState.COMPLETED:
            completedCount++;
            break;
          case EscrowState.REFUNDED:
            refundedCount++;
            break;
        }
      } catch (error) {
        console.error(`Error fetching escrow ${escrowAddress}:`, error);
      }
    }

    return NextResponse.json({
      totalEscrows: factoryStats[0].toString(),
      volumeProcessed: factoryStats[1].toString(),
      feesCollected: factoryStats[2].toString(),
      escrowsByState: {
        created: createdCount,
        disputed: disputedCount,
        completed: completedCount,
        refunded: refundedCount,
      },
      successRate:
        completedCount + refundedCount > 0
          ? ((completedCount / (completedCount + refundedCount)) * 100).toFixed(2)
          : "0",
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

