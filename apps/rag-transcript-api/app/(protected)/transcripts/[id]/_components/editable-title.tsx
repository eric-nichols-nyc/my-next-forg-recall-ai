"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNoteTitle } from "@/actions/update-note-title.action";

type EditableTitleProps = {
  noteId: string;
  initialTitle: string;
};

export function EditableTitle({ noteId, initialTitle }: EditableTitleProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [isPending, startTransition] = useTransition();

  // Update title when initialTitle changes (after refresh)
  useEffect(() => {
    if (!isEditing) {
      setTitle(initialTitle);
    }
  }, [initialTitle, isEditing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const saveTitle = () => {
    if (title.trim() === initialTitle || !title.trim()) {
      setTitle(initialTitle);
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        await updateNoteTitle({ noteId, title: title.trim() });
        router.refresh();
        setIsEditing(false);
      } catch (error) {
        console.error("Failed to update title:", error);
        setTitle(initialTitle); // Revert on error
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update title. Please try again."
        );
      }
    });
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTitle();
  };

  const handleTitleBlur = () => {
    if (title.trim() !== initialTitle) {
      saveTitle();
    } else {
      setIsEditing(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur(); // This will trigger handleTitleBlur
    }
    if (e.key === "Escape") {
      setTitle(initialTitle); // Revert to original
      setIsEditing(false);
      e.currentTarget.blur();
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <form className="flex-1" onSubmit={handleTitleSubmit}>
        <Input
          autoFocus
          className="h-auto min-h-[2.5rem] border px-2 py-1 font-bold text-3xl tracking-tight focus-visible:ring-2"
          disabled={isPending}
          onBlur={handleTitleBlur}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          type="text"
          value={title}
        />
      </form>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <h1 className="min-w-0 flex-1 font-bold text-3xl tracking-tight">
        {title}
      </h1>
      <Button
        aria-label="Edit title"
        className="shrink-0"
        onClick={handleEditClick}
        size="icon-sm"
        variant="ghost"
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}
