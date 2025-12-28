"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type YouTubeInputFormProps = {
  onSuccess: (noteId: string) => void;
};

export function YouTubeInputForm({ onSuccess }: YouTubeInputFormProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    setIsLoading(true);

    try {
      const response = await fetch("/api/notes/transcripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch transcript and generate notes.");
      }

      // Use sourceId for navigation (the route expects sourceId in the URL)
      onSuccess(data.sourceId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Input
          className="w-full"
          disabled={isLoading}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=VIDEO_ID or VIDEO_ID"
          type="text"
          value={url}
        />
        <p className="text-muted-foreground text-sm">
          Enter a YouTube video URL or video ID to extract transcript and generate notes
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button disabled={isLoading || !url.trim()} type="submit">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Fetching Transcript and Generating Notes...
          </>
        ) : (
          "Generate Notes from YouTube"
        )}
      </Button>
    </form>
  );
}

