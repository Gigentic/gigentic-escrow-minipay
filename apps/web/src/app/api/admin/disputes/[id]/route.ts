import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { celoSepolia } from "viem/chains";
import { isAdmin } from "@/lib/wallet-auth";
import {
  ESCROW_CONTRACT_ABI,
  EscrowState,
} from "@/lib/escrow-config";

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
    // Check admin authorization
    const adminAddress = request.headers.get("x-wallet-address") as Address | null;
    if (!adminAddress || !isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const escrowAddress = params.id as Address;

    // Create public client
    const publicClient = createPublicClient({
      chain: celoSepolia,
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

    // Get deliverable document
    let deliverable = null;
    try {
      const docResponse = await fetch(
        `${request.url.split('/api')[0]}/api/documents/${details[6]}`,
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
      disputeReason: disputeInfo[0],
      deliverable,
    });
  } catch (error) {
    console.error("Error fetching dispute details:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispute details" },
      { status: 500 }
    );
  }
}

