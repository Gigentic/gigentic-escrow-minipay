import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { celoSepolia, hardhat, celo } from "viem/chains";
import { isAdmin } from "@/lib/wallet-auth";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
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
 * GET /api/admin/disputes
 * List all disputed escrows
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
      chain: getChain(),
      transport: http(),
    });

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
            console.error(`Error fetching dispute document for ${escrowAddress}:`, err);
            // Keep fallback value (the hash itself)
          }

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
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

