import { NextResponse } from "next/server";

import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";

type NoteWithSource = {
  id: string;
  sourceId: string;
  summaryMd: string;
  createdAt: Date;
  source: { title: string | null } | null;
};

export async function GET() {
  try {
    const { user } = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await database.note.findMany({
      where: { ownerId: user.id },
      include: { source: true },
      orderBy: { createdAt: "desc" },
    });

    const summaries = notes.map((note: NoteWithSource) => ({
      id: note.id,
      sourceId: note.sourceId,
      title: note.source?.title ?? "Untitled source",
      createdAt: note.createdAt,
      summary: note.summaryMd,
    }));

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Error fetching summaries", error);
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}
