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
import { importYoutube } from "../actions";

type YouTubeActionsFormProps = {
  onSuccess: (noteId: string) => void;
};

// Move regex patterns to top level for performance
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const URL_PATTERNS = [
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/,
];

export function YouTubeActionsForm({ onSuccess }: YouTubeActionsFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isValidYouTubeUrl = (string: string) => {
    const trimmed = string.trim();

    if (VIDEO_ID_PATTERN.test(trimmed)) {
      return true;
    }

    return URL_PATTERNS.some((pattern) => pattern.test(trimmed));
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

    startTransition(async () => {
      try {
        const result = await importYoutube({ url: url.trim() });
        onSuccess(result.noteId);
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
          Enter a YouTube video URL or video ID to extract transcript and
          generate notes.
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
            Processing...
          </>
        ) : (
          "Generate Notes from YouTube"
        )}
      </Button>
    </form>
  );
}
