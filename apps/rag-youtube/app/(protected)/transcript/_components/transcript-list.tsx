import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ExternalLink, VideoIcon } from "lucide-react";
import Link from "next/link";

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
          {transcripts.map((transcript) => {
            const displayTitle =
              transcript.note?.title ||
              transcript.title ||
              "Untitled Transcript";
            const hasNote = !!transcript.note;
            const note = transcript.note;

            return (
              <Card
                className={`transition-colors hover:bg-accent ${
                  hasNote ? "cursor-pointer" : "opacity-60"
                }`}
                key={transcript.id}
              >
                {note ? (
                  <Link href={`/transcript/${note.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="line-clamp-2">
                            {displayTitle}
                          </CardTitle>
                          {transcript.url ? (
                            <CardDescription className="flex items-center gap-1">
                              <ExternalLink className="size-3" />
                              {transcript.url}
                            </CardDescription>
                          ) : null}
                        </div>
                        <VideoIcon className="size-5 shrink-0 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-muted-foreground text-sm">
                        <span>
                          {new Date(transcript.createdAt).toLocaleDateString()}
                        </span>
                        {note ? (
                          <span className="text-primary">View Note →</span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Link>
                ) : (
                  <>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="line-clamp-2">
                            {displayTitle}
                          </CardTitle>
                          {transcript.url ? (
                            <CardDescription className="flex items-center gap-1">
                              <ExternalLink className="size-3" />
                              {transcript.url}
                            </CardDescription>
                          ) : null}
                        </div>
                        <VideoIcon className="size-5 shrink-0 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-muted-foreground text-sm">
                        <span>
                          {new Date(transcript.createdAt).toLocaleDateString()}
                        </span>
                        <span>Processing...</span>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
