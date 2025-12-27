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

type WebpageInputFormProps = {
  onSuccess: (noteId: string) => void;
};

export function WebpageInputForm({ onSuccess }: WebpageInputFormProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (string: string) => {
    try {
      const urlObj = new URL(string);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL to scrape.");
      return;
    }

    if (!isValidUrl(url.trim())) {
      setError(
        "Please enter a valid URL (must start with http:// or https://)."
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/notes/web", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to scrape and generate notes.");
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
          placeholder="https://example.com"
          type="url"
          value={url}
        />
        <p className="text-muted-foreground text-sm">
          Enter a website URL to scrape and generate notes from
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
            Scraping and Generating Notes...
          </>
        ) : (
          "Scrape and Generate Notes"
        )}
      </Button>
    </form>
  );
}
