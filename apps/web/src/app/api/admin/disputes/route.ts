import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { celoSepolia, hardhat, celo } from "viem/chains";
import { requireAdmin } from "@/lib/server-auth";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  ESCROW_CONTRACT_ABI,
  EscrowState,
  CHAIN_ID,
} from "@/lib/escrow-config";
import { getKVClient, kvKeys } from "@/lib/kv";
import type { DisputeDocument } from "@/lib/types";

// Tell Next.js this route must be dynamic (server-rendered on demand)
export const dynamic = 'force-dynamic';

// Helper to get the correct chain based on CHAIN_ID
function getChain() {
  switch (CHAIN_ID) {
    case 31337:
      return hardhat;
    case 42220:
      return celo;
    case 11142220:
      return celoSepolia;
    default:
      return celoSepolia;
  }
}

/**
 * GET /api/admin/disputes
 * List all disputed escrows
 * Requires admin wallet address in header
 */
export async function GET() {
  try {
    // Check admin authorization using session
    await requireAdmin();

    // Create public client and KV client
    const publicClient = createPublicClient({
      chain: getChain(),
      transport: http(),
    });
    const kv = getKVClient();

    // Get all escrows
    const allEscrows = await publicClient.readContract({
      address: MASTER_FACTORY_ADDRESS,
      abi: MASTER_FACTORY_ABI,
      functionName: "getAllEscrows",
    });

    // Filter for disputed escrows
    const disputedEscrows = [];

    for (const escrowAddress of allEscrows) {
      try {
        const details = await publicClient.readContract({
          address: escrowAddress as Address,
          abi: ESCROW_CONTRACT_ABI,
          functionName: "getDetails",
        });

        const state = details[5] as EscrowState;

        if (state === EscrowState.DISPUTED) {
          const disputeInfo = await publicClient.readContract({
            address: escrowAddress as Address,
            abi: ESCROW_CONTRACT_ABI,
            functionName: "getDisputeInfo",
          });

          // Fetch dispute reason from KV directly
          const [disputeReasonHash] = disputeInfo;
          const disputeDoc = await kv.get<DisputeDocument>(kvKeys.dispute(disputeReasonHash as string));
          const actualDisputeReason = disputeDoc?.reason || "Dispute reason not found";

          disputedEscrows.push({
            address: escrowAddress,
            depositor: details[0],
            recipient: details[1],
            escrowAmount: details[2].toString(),
            platformFee: details[3].toString(),
            disputeBond: details[4].toString(),
            deliverableHash: details[6],
            createdAt: details[7].toString(),
            disputeReason: actualDisputeReason,
          });
        }
      } catch (error) {
        console.error(`Error fetching escrow ${escrowAddress}:`, error);
      }
    }

    return NextResponse.json({
      count: disputedEscrows.length,
      disputes: disputedEscrows,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
    }
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

