"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type YouTubeInputFormProps = {
  onSuccess: (sourceId: string) => void;
};

type StatusResponse = {
  status: "pending" | "completed" | "not_found";
  sourceId: string;
  hasTexts?: boolean;
};

/**
 * YouTube input form with async processing and polling
 * Submits YouTube URL, creates Source record immediately, then polls for transcript completion
 */
export function YouTubeInputFormAsync({ onSuccess }: YouTubeInputFormProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(
    () => () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    },
    []
  );

  const isValidYouTubeUrl = (string: string) => {
    const trimmed = string.trim();
    const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    const urlPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/,
    ];

    if (videoIdPattern.test(trimmed)) {
      return true;
    }

    return urlPatterns.some((pattern) => pattern.test(trimmed));
  };

  const checkStatus = async (checkSourceId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/notes/transcripts/status/${checkSourceId}`
      );
      if (!response.ok) {
        throw new Error("Failed to check status");
      }

      const data: StatusResponse = await response.json();

      if (data.status === "completed") {
        // Transcript is ready!
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsPolling(false);
        setIsLoading(false);
        onSuccess(checkSourceId);
        return true;
      }

      if (data.status === "not_found") {
        throw new Error("Source not found");
      }

      // Still pending
      return false;
    } catch (err) {
      console.error("Error checking status:", err);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsPolling(false);
      setIsLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to check transcript status. Please refresh the page."
      );
      return false;
    }
  };

  const startPolling = (checkSourceId: string) => {
    setIsPolling(true);

    // Check immediately
    checkStatus(checkSourceId);

    // Then poll every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      checkStatus(checkSourceId).then((completed) => {
        if (completed && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      });
    }, 2000);

    // Stop polling after 5 minutes (300 seconds) as a safety measure
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setIsPolling(false);
        setIsLoading(false);
        setError(
          "Transcript processing is taking longer than expected. Please try again later."
        );
      }
    }, 300_000); // 5 minutes
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
      // Initiate async transcript processing
      const response = await fetch("/api/notes/transcripts/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to initiate transcript processing."
        );
      }

      // Get sourceId from response
      const newSourceId = data.sourceId as string;
      if (!newSourceId) {
        throw new Error("No sourceId returned from server");
      }

      setSourceId(newSourceId);

      // Start polling for status
      startPolling(newSourceId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
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
          Enter a YouTube video URL or video ID to extract transcript and
          generate notes. Processing may take a few moments...
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isPolling ? (
        <Alert>
          <AlertTitle>Processing...</AlertTitle>
          <AlertDescription>
            Your transcript is being processed. This may take a minute or two.
            You can close this dialog - the page will update automatically when
            ready.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button disabled={isLoading || !url.trim()} type="submit">
        {isLoading || isPolling ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {isPolling
              ? "Processing Transcript..."
              : "Initiating Processing..."}
          </>
        ) : (
          "Generate Notes from YouTube"
        )}
      </Button>
    </form>
  );
}
