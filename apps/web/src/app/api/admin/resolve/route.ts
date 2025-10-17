import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/wallet-auth";
import { hashDocument } from "@/lib/hash";
import { kvKeys, getKVClient } from "@/lib/kv";
import { type Address } from "viem";

/**
 * POST /api/admin/resolve
 * Store resolution document and return hash for on-chain transaction
 * 
 * The actual blockchain transaction (escrow.resolve()) must be done client-side
 * This endpoint only stores the resolution document
 * 
 * Body:
 * - escrowAddress: Address of the escrow
 * - arbiter: Address of the arbiter (admin)
 * - favorDepositor: boolean
 * - disputeReason: string
 * - deliverableReview: string
 * - evidenceConsidered: string[]
 * - decisionRationale: string
 */
export async function POST(request: Request) {
  try {
    // Check admin authorization
    const adminAddress = request.headers.get("x-wallet-address") as Address | null;
    if (!adminAddress || !isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      escrowAddress,
      favorDepositor,
      disputeReason,
      deliverableReview,
      evidenceConsidered,
      decisionRationale,
    } = body;

    // Validate input
    if (
      !escrowAddress ||
      favorDepositor === undefined ||
      !disputeReason ||
      !deliverableReview ||
      !evidenceConsidered ||
      !decisionRationale
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create resolution document
    const resolutionDocument = {
      escrowAddress,
      arbiter: adminAddress,
      favorDepositor,
      disputeReason,
      deliverableReview,
      evidenceConsidered,
      decisionRationale,
      resolvedAt: Date.now(),
      transactionHash: "", // Will be updated after on-chain transaction
    };

    // Generate hash
    const resolutionHash = hashDocument(resolutionDocument);

    // Store in KV
    const kv = getKVClient();
    await kv.set(kvKeys.resolution(resolutionHash), resolutionDocument);

    return NextResponse.json({
      success: true,
      resolutionHash,
      message: "Resolution document stored. Use this hash to call escrow.resolve() on-chain.",
    });
  } catch (error) {
    console.error("Error storing resolution:", error);
    return NextResponse.json(
      { error: "Failed to store resolution" },
      { status: 500 }
    );
  }
}

