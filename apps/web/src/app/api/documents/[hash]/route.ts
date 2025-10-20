import { NextResponse } from "next/server";
import { getKVClient, kvKeys } from "@/lib/kv";

/**
 * GET /api/documents/[hash]
 * Retrieve a document by its hash or escrow address
 *
 * For deliverables: expects escrow address
 * For disputes/resolutions: expects hash
 */
export async function GET(
  _request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;

    if (!hash) {
      return NextResponse.json(
        { error: "Hash/address parameter required" },
        { status: 400 }
      );
    }

    const kv = getKVClient();

    // Check if it's an address (starts with 0x and is 42 chars) vs hash (66 chars)
    const isAddress = hash.startsWith("0x") && hash.length === 42;
    let document = null;
    let type = "";

    if (isAddress) {
      // Try deliverable by escrow address
      document = await kv.get(kvKeys.deliverable(hash));
      type = "deliverable";
    } else {
      // Try resolution first
      document = await kv.get(kvKeys.resolution(hash));
      type = "resolution";

      // If not found, try dispute
      if (!document) {
        document = await kv.get(kvKeys.dispute(hash));
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

