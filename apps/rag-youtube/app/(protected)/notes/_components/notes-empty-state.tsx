"use client";

import { NoteGenerationModal } from "./note-generation-modal";
import { Button } from "@repo/design-system/components/ui/button";
import { FileText } from "lucide-react";

export function NotesEmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">No notes selected</h2>
          <p className="text-muted-foreground">
            Create a new note to get started
          </p>
        </div>
        <NoteGenerationModal>
          <Button>
            <FileText className="size-4" />
            Add New Note
          </Button>
        </NoteGenerationModal>
      </div>
    </div>
  );
}

