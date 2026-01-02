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
import { YouTubeActionsForm } from "./youtube-actions-form";

export function TranscriptEmptyState() {
  const router = useRouter();

  const handleSuccess = (noteId: string) => {
    console.log("noteId =", noteId);
    // Navigate to the note page when transcript is ready
    router.push(`/transcript/${noteId}`);
  };

  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
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
  );
}
