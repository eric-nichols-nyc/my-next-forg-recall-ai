import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { database } from "@repo/prisma-neon";
import { Chat } from "@/components/chat";
import { SplitLayout } from "@/components/split-layout";
import { NotesContent } from "../_components/notes-content";

type NoteData = {
  id: string;
  sourceId: string;
  title: string;
  summaryMd: string;
  createdAt: Date;
};

async function fetchNote(
  sourceId: string,
  ownerId: string
): Promise<NoteData | null> {
  try {
    const note = await database.note.findUnique({
      where: { sourceId },
      include: { source: true },
    });

    if (!note) {
      return null;
    }

    // Verify the note belongs to the authenticated user
    if (note.ownerId !== ownerId) {
      return null;
    }

    return {
      id: note.id,
      sourceId: note.sourceId,
      title: note.title ?? note.source?.title ?? "Untitled Note",
      summaryMd: note.summaryMd,
      createdAt: note.createdAt,
    };
  } catch (error) {
    console.error("Error fetching note:", error);
    return null;
  }
}

export default async function NotesIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, user } = await neonAuth();

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view notes.</p>
      </div>
    );
  }

  const note = await fetchNote(id, user.id);

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <SplitLayout
        left={<NotesContent note={note} session={session} user={user} />}
        right={
          <div className="flex h-full flex-col overflow-y-auto border-l bg-muted/50 p-6">
            <Chat noteContext={note.summaryMd} />
          </div>
        }
      />
    </div>
  );
}
