import { database } from "@repo/prisma-neon";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/notes/transcripts/status/[sourceId]
 * Check if transcript has been uploaded for a source
 * Returns status: "pending" | "completed" | "not_found"
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { getSession } = await import("@repo/neon-auth");
    const sessionResult = await getSession();

    if (!sessionResult?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = await params;
    const userId = sessionResult.user.id;

    // Check if source exists and belongs to user
    const source = await database.source.findUnique({
      where: { id: sourceId },
      include: {
        texts: {
          select: { id: true },
          take: 1, // Just check if any texts exist
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        { status: "not_found", sourceId },
        { status: 200 }
      );
    }

    // Verify ownership
    if (source.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if transcript texts have been uploaded
    const hasTexts = source.texts.length > 0;

    return NextResponse.json({
      status: hasTexts ? "completed" : "pending",
      sourceId,
      hasTexts,
    });
  } catch (error) {
    console.error("Error checking transcript status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
