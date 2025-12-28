"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type TextInputFormProps = {
  onSuccess: (noteId: string) => void;
};

export function TextInputForm({ onSuccess }: TextInputFormProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError("Please enter some text to generate notes.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/notes/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate notes.");
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
        <Textarea
          className="max-h-[400px] min-h-[200px] resize-y overflow-y-auto"
          disabled={isLoading}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here..."
          value={text}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button disabled={isLoading || !text.trim()} type="submit">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Generating Notes...
          </>
        ) : (
          "Generate Notes"
        )}
      </Button>
    </form>
  );
}
