import { NextResponse } from "next/server";
import { getKVClient, kvKeys } from "@/lib/kv";
import { verifyDocumentHash } from "@/lib/hash";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { type Address } from "viem";

/**
 * POST /api/documents/store
 * Store a deliverable, dispute, or resolution document in KV storage
 *
 * Requires authentication:
 * - Deliverables: Only depositor or recipient can store
 * - Disputes: Only depositor or recipient can store
 * - Resolutions: Only admin can store
 *
 * Body:
 * - hash: Document hash (hex string)
 * - document: Document object (deliverable, dispute, or resolution)
 * - escrowAddress: Required for deliverable documents
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hash, document, escrowAddress, chainId } = body;

    // Validate input
    if (!hash || !document) {
      return NextResponse.json(
        { error: "Missing hash or document" },
        { status: 400 }
      );
    }

    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json(
        { error: "Missing or invalid chainId" },
        { status: 400 }
      );
    }

    // Verify hash matches document
    const isValid = verifyDocumentHash(document, hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Document hash verification failed" },
        { status: 400 }
      );
    }

    // Determine document type based on structure
    const isDeliverable = "acceptanceCriteria" in document && !("arbiter" in document) && !("raiser" in document);
    const isResolution = "arbiter" in document && "favorDepositor" in document;
    const isDispute = "raiser" in document && "reason" in document && !("arbiter" in document);

    // For deliverables, require escrowAddress
    if (isDeliverable && !escrowAddress) {
      return NextResponse.json(
        { error: "Missing escrowAddress for deliverable document" },
        { status: 400 }
      );
    }

    // Authorization checks based on document type
    if (isResolution) {
      // Only admin can store resolutions
      if (!user.isAdmin) {
        return NextResponse.json(
          { error: "Admin access required to store resolutions" },
          { status: 403 }
        );
      }
    } else if (isDeliverable) {
      // Only depositor or recipient can store deliverables
      const depositor = document.depositor as Address;
      const recipient = document.recipient as Address;

      const hasAccess =
        user.isAdmin ||
        user.address.toLowerCase() === depositor.toLowerCase() ||
        user.address.toLowerCase() === recipient.toLowerCase();

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You don't have access to store this deliverable" },
          { status: 403 }
        );
      }
    } else if (isDispute) {
      // Only depositor or recipient can store disputes
      const raiser = document.raiser as Address;
      const escrowAddr = document.escrowAddress as string;

      // Fetch deliverable to get both parties
      const kv = getKVClient();
      const deliverable: any = await kv.get(kvKeys.deliverable(chainId, escrowAddr));

      if (!deliverable) {
        return NextResponse.json(
          { error: "Associated deliverable not found" },
          { status: 404 }
        );
      }

      const depositor = deliverable.depositor as Address;
      const recipient = deliverable.recipient as Address;

      const hasAccess =
        user.isAdmin ||
        user.address.toLowerCase() === depositor.toLowerCase() ||
        user.address.toLowerCase() === recipient.toLowerCase();

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You don't have access to store this dispute" },
          { status: 403 }
        );
      }

      // Verify raiser is actually one of the parties
      if (
        raiser.toLowerCase() !== depositor.toLowerCase() &&
        raiser.toLowerCase() !== recipient.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Dispute raiser must be depositor or recipient" },
          { status: 400 }
        );
      }
    }

    // Generate appropriate key
    const key = isDeliverable
      ? kvKeys.deliverable(chainId, escrowAddress)
      : isResolution
        ? kvKeys.resolution(chainId, hash)
        : kvKeys.dispute(chainId, hash);

    // Store in KV
    const kv = getKVClient();
    await kv.set(key, document);

    const type = isResolution ? "resolution" : isDispute ? "dispute" : "deliverable";

    return NextResponse.json({
      success: true,
      hash,
      key,
      type,
    });
  } catch (error) {
    console.error("Error storing document:", error);
    return NextResponse.json(
      { error: "Failed to store document" },
      { status: 500 }
    );
  }
}

