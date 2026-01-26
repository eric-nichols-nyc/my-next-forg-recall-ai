import { TranscriptCard } from "./transcript-card";

type Transcript = {
  id: string;
  url: string | null;
  title: string | null;
  createdAt: Date;
  note: {
    id: string;
    title: string | null;
    summaryMd: string;
    createdAt: Date;
  } | null;
};

type TranscriptListProps = {
  transcripts: Transcript[];
};

export function TranscriptList({ transcripts }: TranscriptListProps) {
  if (transcripts.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div>
          <h2 className="font-semibold text-2xl">Your Transcripts</h2>
          <p className="text-muted-foreground text-sm">
            {transcripts.length} transcript{transcripts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="space-y-3">
          {transcripts.map((transcript) => (
            <TranscriptCard key={transcript.id} transcript={transcript} />
          ))}
        </div>
      </div>
    </div>
  );
}
