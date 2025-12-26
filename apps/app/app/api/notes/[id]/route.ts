import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";
import { NextResponse } from "next/server";

type User = {
  id: string;
  email: string;
  name: string | null;
};

async function getAuthenticatedUser(): Promise<User> {
  try {
    const sessionResult = await getSession();
    const user = sessionResult.user;
    if (!user) {
      throw new Error("Unauthorized");
    }
    return user as User;
  } catch (error) {
    console.error("Error getting session:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    throw new Error("Failed to verify authentication.");
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user: User;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify authentication",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    let note;
    try {
      note = await database.note.findUnique({
        where: { sourceId: id },
        include: { source: true },
      });
    } catch (error) {
      console.error("Error fetching note from database:", error);
      return NextResponse.json(
        { error: "Database error. Please try again later." },
        { status: 500 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: "Note not found." },
        { status: 404 }
      );
    }

    // Verify the note belongs to the authenticated user
    if (note.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to access this note." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: note.id,
      sourceId: note.sourceId,
      title: note.source?.title ?? "Untitled source",
      summaryMd: note.summaryMd,
      createdAt: note.createdAt,
    });
  } catch (error) {
    console.error("Unexpected error fetching note:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

