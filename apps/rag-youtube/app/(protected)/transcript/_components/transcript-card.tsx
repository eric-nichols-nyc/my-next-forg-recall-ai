"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTranscript } from "../actions";

const FALLBACK_IMAGE_URL =
  "https://4poo5cpwk1.ufs.sh/f/PXOpqElmK39N7XoZycQKqjNSJYQmEZUs2Ha9iDktxngef84r";

// Regex patterns for extracting YouTube video ID
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;

function extractVideoId(urlOrId: string | null): string | null {
  if (!urlOrId) return null;

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

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

type TranscriptCardProps = {
  transcript: {
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
};

export function TranscriptCard({ transcript }: TranscriptCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const displayTitle =
    transcript.note?.title || transcript.title || "Untitled Transcript";
  const hasNote = !!transcript.note;
  const note = transcript.note;

  const videoId = extractVideoId(transcript.url);
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : null;
  const imageUrl =
    imageError || !thumbnailUrl ? FALLBACK_IMAGE_URL : thumbnailUrl;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this transcript?")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteTranscript({ sourceId: transcript.id });
        router.refresh();
      } catch (error) {
        console.error("Failed to delete transcript:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to delete transcript. Please try again."
        );
      }
    });
  };

  const cardContent = (
    <>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="relative size-32 shrink-0 overflow-hidden rounded-lg">
            <Image
              alt={displayTitle}
              className="object-cover"
              fill
              onError={() => setImageError(true)}
              src={imageUrl}
            />
          </div>
          <div className="flex flex-1 items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 flex-1">
              {displayTitle}
            </CardTitle>
            <Button
              aria-label="Delete transcript"
              className="shrink-0"
              disabled={isPending}
              onClick={handleDelete}
              size="icon-sm"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </>
  );

  return (
    <Card
      className={`transition-colors hover:bg-accent ${
        hasNote ? "cursor-pointer" : "opacity-60"
      }`}
      key={transcript.id}
    >
      {note ? (
        <Link href={`/transcript/${note.id}`}>{cardContent}</Link>
      ) : (
        cardContent
      )}
    </Card>
  );
}
