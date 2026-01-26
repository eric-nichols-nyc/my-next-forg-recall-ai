"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import type { NoteData } from "@/actions/get-note-by-id.action";
import { EditableTitle } from "./editable-title";

// Regex patterns for extracting YouTube video ID
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;

function extractVideoId(urlOrId: string | null): string | null {
  if (!urlOrId) {
    return null;
  }

  const trimmed = urlOrId.trim();

  // If it's already a video ID (11 characters, alphanumeric and hyphens/underscores)
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Try to extract from various YouTube URL formats
  const match = trimmed.match(YOUTUBE_URL_PATTERN);
  if (match?.[1]) {
    return match[1];
  }

  return null;
}

type TranscriptNoteContentProps = {
  note: NoteData;
};

export function TranscriptNoteContent({ note }: TranscriptNoteContentProps) {
  const router = useRouter();
  const videoId = extractVideoId(note.url);

  // Safely construct YouTube embed URL with validation
  const embedUrl = useMemo(() => {
    if (!videoId) {
      return null;
    }
    if (!VIDEO_ID_PATTERN.test(videoId)) {
      return null;
    }
    return `https://www.youtube.com/embed/${videoId}`;
  }, [videoId]);

  const hasValidEmbedUrl = embedUrl !== null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 p-8">
          <div className="space-y-3 border-border border-b pb-6">
            <div className="flex items-center gap-4">
              <Button
                className="shrink-0"
                onClick={() => router.push("/transcripts")}
                size="sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <div className="flex-1 space-y-3">
                <EditableTitle initialTitle={note.title} noteId={note.id} />
                <p className="text-muted-foreground text-sm">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          {hasValidEmbedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                src={embedUrl}
                title={note.title}
              />
            </div>
          ) : null}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <Streamdown>{note.summaryMd}</Streamdown>
          </div>
        </div>
      </div>
    </div>
  );
}
