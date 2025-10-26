import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { celoSepolia, hardhat, celo } from "viem/chains";
import { requireAdmin } from "@/lib/server-auth";
import {
  ESCROW_CONTRACT_ABI,
  EscrowState,
  CHAIN_ID,
} from "@/lib/escrow-config";
import { getKVClient, kvKeys } from "@/lib/kv";

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
 * GET /api/admin/disputes/[id]
 * Get detailed information about a specific disputed escrow
 * Includes deliverable document if available
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization using session
    await requireAdmin();

    const escrowAddress = params.id as Address;

    // Create public client
    const publicClient = createPublicClient({
      chain: getChain(),
      transport: http(),
    });

    // Get escrow details
    const details = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_CONTRACT_ABI,
      functionName: "getDetails",
    });

    const state = details[5] as EscrowState;

    if (state !== EscrowState.DISPUTED) {
      return NextResponse.json(
        { error: "Escrow is not in disputed state" },
        { status: 400 }
      );
    }

    // Get dispute info
    const disputeInfo = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_CONTRACT_ABI,
      functionName: "getDisputeInfo",
    });

    // disputeInfo[0] is now a hash, fetch actual dispute reason from KV
    const disputeReasonHash = disputeInfo[0] as string;
    let actualDisputeReason = disputeReasonHash; // Fallback to hash if fetch fails

    try {
      const kv = getKVClient();
      const disputeDoc = await kv.get(kvKeys.dispute(disputeReasonHash));
      if (disputeDoc && typeof disputeDoc === 'object' && 'reason' in disputeDoc) {
        actualDisputeReason = disputeDoc.reason as string;
      }
    } catch (err) {
      console.error("Error fetching dispute document from KV:", err);
      // Keep fallback value (the hash itself)
    }

    // Get deliverable document (using escrow address as key)
    let deliverable = null;
    try {
      const docResponse = await fetch(
        `${request.url.split('/api')[0]}/api/documents/${escrowAddress}`,
        { headers: request.headers }
      );
      if (docResponse.ok) {
        const docData = await docResponse.json();
        deliverable = docData.document;
      }
    } catch (error) {
      console.error("Error fetching deliverable:", error);
    }

    return NextResponse.json({
      address: escrowAddress,
      depositor: details[0],
      recipient: details[1],
      escrowAmount: details[2].toString(),
      platformFee: details[3].toString(),
      disputeBond: details[4].toString(),
      deliverableHash: details[6],
      createdAt: details[7].toString(),
      disputeReason: actualDisputeReason,
      deliverable,
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
    console.error("Error fetching dispute details:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispute details" },
      { status: 500 }
    );
  }
}

