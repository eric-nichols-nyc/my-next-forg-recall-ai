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

export function YouTubeTranscriptViewer() {
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidYouTubeUrl = (string: string) => {
    const trimmed = string.trim();
    // Check if it's a valid YouTube URL or video ID
    const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    const urlPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/,
    ];

    if (videoIdPattern.test(trimmed)) {
      return true;
    }

    return urlPatterns.some((pattern) => pattern.test(trimmed));
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

      {transcript && (
        <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold text-lg">Transcript</h3>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {transcript}
          </div>
        </div>
      )}
    </div>
  );
}
