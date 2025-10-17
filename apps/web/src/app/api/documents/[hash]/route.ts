import { NextResponse } from "next/server";
import { getKVClient, kvKeys } from "@/lib/kv";

/**
 * GET /api/documents/[hash]
 * Retrieve a document by its hash
 * 
 * Tries both deliverable and resolution prefixes
 */
export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;

    if (!hash) {
      return NextResponse.json(
        { error: "Hash parameter required" },
        { status: 400 }
      );
    }

    const kv = getKVClient();

    // Try deliverable first
    let document = await kv.get(kvKeys.deliverable(hash));
    let type = "deliverable";

    // If not found, try resolution
    if (!document) {
      document = await kv.get(kvKeys.resolution(hash));
      type = "resolution";
    }

    // If still not found, return 404
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
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

