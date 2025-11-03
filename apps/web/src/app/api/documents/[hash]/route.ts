import { NextResponse } from "next/server";
import { getKVClient, kvKeys } from "@/lib/kv";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { type Address } from "viem";

/**
 * GET /api/documents/[hash]?chainId=<chainId>
 * Retrieve a document by its hash or escrow address
 *
 * For deliverables: expects escrow address
 * For disputes/resolutions: expects hash
 *
 * Requires authentication - only depositor, recipient, or admin can access
 */
export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    if (!hash) {
      return NextResponse.json(
        { error: "Hash/address parameter required" },
        { status: 400 }
      );
    }

    if (!chainId) {
      return NextResponse.json(
        { error: "chainId query parameter required" },
        { status: 400 }
      );
    }

    const chainIdNum = Number(chainId);
    if (isNaN(chainIdNum)) {
      return NextResponse.json(
        { error: "Invalid chainId" },
        { status: 400 }
      );
    }

    const kv = getKVClient();

    // Check if it's an address (starts with 0x and is 42 chars) vs hash (66 chars)
    const isAddress = hash.startsWith("0x") && hash.length === 42;
    let document: any = null;
    let type = "";

    if (isAddress) {
      // Try deliverable by escrow address
      document = await kv.get(kvKeys.deliverable(chainIdNum, hash));
      type = "deliverable";
    } else {
      // Try resolution first
      document = await kv.get(kvKeys.resolution(chainIdNum, hash));
      type = "resolution";

      // If not found, try dispute
      if (!document) {
        document = await kv.get(kvKeys.dispute(chainIdNum, hash));
        type = "dispute";
      }
    }

    // If still not found, return 404
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check authorization - user must be depositor, recipient, or admin
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract depositor and recipient based on document type
    let depositor: Address;
    let recipient: Address;

    if (type === "deliverable") {
      depositor = document.depositor as Address;
      recipient = document.recipient as Address;
    } else if (type === "dispute") {
      // For disputes, we need to fetch the deliverable to get depositor/recipient
      const escrowAddress = document.escrowAddress as string;
      const deliverable: any = await kv.get(kvKeys.deliverable(chainIdNum, escrowAddress));
      if (!deliverable) {
        return NextResponse.json(
          { error: "Associated deliverable not found" },
          { status: 404 }
        );
      }
      depositor = deliverable.depositor as Address;
      recipient = deliverable.recipient as Address;
    } else {
      // type === "resolution"
      // For resolutions, we need to fetch the deliverable to get depositor/recipient
      const escrowAddress = document.escrowAddress as string;
      const deliverable: any = await kv.get(kvKeys.deliverable(chainIdNum, escrowAddress));
      if (!deliverable) {
        return NextResponse.json(
          { error: "Associated deliverable not found" },
          { status: 404 }
        );
      }
      depositor = deliverable.depositor as Address;
      recipient = deliverable.recipient as Address;
    }

    // Verify access
    const hasAccess =
      user.isAdmin ||
      user.address.toLowerCase() === depositor.toLowerCase() ||
      user.address.toLowerCase() === recipient.toLowerCase();

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this escrow" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      hash,
      type,
      document,
    });
  } catch (error) {
    console.error("Error retrieving document:", error);
    return NextResponse.json(
      { error: "Failed to retrieve document" },
      { status: 500 }
    );
  }
}

