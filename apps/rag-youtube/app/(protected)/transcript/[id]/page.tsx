import { TranscriptNoteContent } from "./_components/transcript-note-content";
import { getNoteById } from "./actions";

export default async function TranscriptIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNoteById(id);

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <TranscriptNoteContent note={note} />
    </div>
  );
}
