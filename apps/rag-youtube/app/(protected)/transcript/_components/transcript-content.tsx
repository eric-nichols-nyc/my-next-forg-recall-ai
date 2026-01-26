"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { TranscriptList } from "./transcript-list";
import { YouTubeActionsForm } from "./youtube-actions-form";

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

type TranscriptContentProps = {
  transcripts: Transcript[];
};

export function TranscriptContent({ transcripts }: TranscriptContentProps) {
  const router = useRouter();

  const handleSuccess = (noteId: string) => {
    console.log("noteId =", noteId);
    // Navigate to the note page when transcript is ready
    router.push(`/transcript/${noteId}`);
  };

  const hasTranscripts = transcripts.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Form Section - Always Visible */}
      <div className="shrink-0 border-b bg-background p-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <VideoIcon className="size-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Add YouTube Transcript</CardTitle>
            <CardDescription>
              Enter a YouTube URL to extract the transcript and generate notes.
              Processing may take a few moments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YouTubeActionsForm onSuccess={handleSuccess} />
          </CardContent>
        </Card>
      </div>

      {/* Transcript List Section - Shows when there are transcripts */}
      {hasTranscripts ? (
        <div className="flex-1 overflow-y-auto">
          <TranscriptList transcripts={transcripts} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-center text-muted-foreground">
            No transcripts yet. Add your first YouTube video above to get
            started.
          </p>
        </div>
      )}
    </div>
  );
}
