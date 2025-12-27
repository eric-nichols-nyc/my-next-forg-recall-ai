"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { FileText, Type, ArrowLeft, Youtube, Globe } from "lucide-react";
import { PdfSummaryUploader } from "@/components/pdf-summary-uploader";
import { TextInputForm } from "./text-input-form";

type ModalMode = "select" | "file" | "text";

type NoteGenerationModalProps = {
  children: React.ReactNode;
};

export function NoteGenerationModal({ children }: NoteGenerationModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("select");
  const router = useRouter();

  const handleSuccess = (noteId: string) => {
    setOpen(false);
    setMode("select");
    router.push(`/notes/${noteId}`);
  };

  const handleBack = () => {
    setMode("select");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset to select mode when dialog closes
      setMode("select");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" && "Create New Note"}
            {mode === "file" && "Upload PDF"}
            {mode === "text" && "Generate from Text"}
          </DialogTitle>
        </DialogHeader>

        {mode === "select" && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 py-6"
              onClick={() => setMode("file")}
            >
              <FileText className="size-6" />
              <span className="text-base">Upload File</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 py-6"
              onClick={() => setMode("text")}
            >
              <Type className="size-6" />
              <span className="text-base">Generate from Text</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 py-6"
              disabled
            >
              <Youtube className="size-6" />
              <span className="text-base">YouTube to Note</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 py-6"
              disabled
            >
              <Globe className="size-6" />
              <span className="text-base">Webpage to Note</span>
            </Button>
          </div>
        )}

        {mode === "file" && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <PdfSummaryUploader onSuccess={handleSuccess} />
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <TextInputForm onSuccess={handleSuccess} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

