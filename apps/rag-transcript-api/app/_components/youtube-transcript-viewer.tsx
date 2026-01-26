"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { fetchYouTubeTranscript } from "../actions";

type TranscriptItem = {
  text: string;
  start: number;
  duration: number;
};

// Regex patterns defined at top level for performance
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/;

export function YouTubeTranscriptViewer() {
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidYouTubeUrl = (string: string) => {
    const trimmed = string.trim();

    if (VIDEO_ID_PATTERN.test(trimmed)) {
      return true;
    }

    return YOUTUBE_URL_PATTERN.test(trimmed);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a YouTube URL or video ID.");
      return;
    }

    if (!isValidYouTubeUrl(url.trim())) {
      setError(
        "Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID) or video ID."
      );
      return;
    }

    setError(null);
    setTranscript(null);

    startTransition(async () => {
      try {
        const result = await fetchYouTubeTranscript(url.trim());
        if (result.success && result.transcript) {
          setTranscript(result.transcript);
        } else {
          setError(result.error || "Failed to fetch transcript");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    });
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Input
            className="w-full"
            disabled={isPending}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=VIDEO_ID or VIDEO_ID"
            type="text"
            value={url}
          />
          <p className="text-muted-foreground text-sm">
            Enter a YouTube video URL or video ID to fetch and display the
            transcript
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button disabled={isPending || !url.trim()} type="submit">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Fetching Transcript...
            </>
          ) : (
            "Fetch Transcript"
          )}
        </Button>
      </form>

      {transcript !== null ? (
        <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold text-lg">Transcript</h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {Array.isArray(transcript) ? (
              <div className="space-y-2">
                {transcript.map((item, index) => (
                  <p key={`${item.start}-${index}`} className="mb-2">
                    <span className="text-muted-foreground text-xs">
                      [{formatTime(item.start)}]
                    </span>{" "}
                    {item.text}
                  </p>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{String(transcript)}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
