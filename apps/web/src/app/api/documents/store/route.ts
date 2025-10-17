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
    const { hash, document } = body;

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
    const isResolution = "arbiter" in document && "favorDepositor" in document;
    const key = isResolution ? kvKeys.resolution(hash) : kvKeys.deliverable(hash);

    // Store in KV
    const kv = getKVClient();
    await kv.set(key, document);

    return NextResponse.json({
      success: true,
      hash,
      key,
      type: isResolution ? "resolution" : "deliverable",
    });
  } catch (error) {
    console.error("Error storing document:", error);
    return NextResponse.json(
      { error: "Failed to store document" },
      { status: 500 }
    );
  }
}

