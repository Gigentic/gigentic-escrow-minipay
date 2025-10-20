import { NextResponse } from "next/server";
import { getKVClient, kvKeys } from "@/lib/kv";
import { verifyDocumentHash } from "@/lib/hash";

/**
 * POST /api/documents/store
 * Store a deliverable or resolution document in KV storage
 * 
 * Body:
 * - hash: Document hash (hex string)
 * - document: Document object (deliverable or resolution)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hash, document, escrowAddress } = body;

    // Validate input
    if (!hash || !document) {
      return NextResponse.json(
        { error: "Missing hash or document" },
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

    // Generate appropriate key
    const key = isDeliverable
      ? kvKeys.deliverable(escrowAddress)
      : isResolution
        ? kvKeys.resolution(hash)
        : kvKeys.dispute(hash);

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

