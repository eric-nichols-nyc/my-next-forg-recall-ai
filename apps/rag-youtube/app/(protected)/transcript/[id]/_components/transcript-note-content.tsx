"use client";

import { Streamdown } from "streamdown";
import { useRouter } from "next/navigation";
import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { NoteData } from "../actions";

type TranscriptNoteContentProps = {
  note: NoteData;
};

export function TranscriptNoteContent({ note }: TranscriptNoteContentProps) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 p-8">
          <div className="space-y-3 border-border border-b pb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/transcript")}
                className="shrink-0"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <div className="flex-1 space-y-3">
                <h1 className="font-bold text-3xl tracking-tight">
                  {note.title}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <Streamdown>{note.summaryMd}</Streamdown>
          </div>
        </div>
      </div>
    </div>
  );
}

