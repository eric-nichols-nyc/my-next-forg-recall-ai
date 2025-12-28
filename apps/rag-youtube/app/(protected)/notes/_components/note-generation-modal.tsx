"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { ArrowLeft, FileText, Globe, Type, Youtube } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PdfSummaryUploader } from "@/components/pdf-summary-uploader";
import { TextInputForm } from "./text-input-form";
import { WebpageInputForm } from "./webpage-input-form";
import { YouTubeInputForm } from "./youtube-input-form";

type ModalMode = "select" | "file" | "text" | "web" | "youtube";

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
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" && "Create New Note"}
            {mode === "file" && "Upload PDF"}
            {mode === "text" && "Generate from Text"}
            {mode === "web" && "Webpage to Note"}
            {mode === "youtube" && "YouTube to Note"}
          </DialogTitle>
        </DialogHeader>

        {mode === "select" && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              className="h-auto flex-col gap-3 py-6"
              onClick={() => setMode("file")}
              variant="outline"
            >
              <FileText className="size-6" />
              <span className="text-base">Upload File</span>
            </Button>
            <Button
              className="h-auto flex-col gap-3 py-6"
              onClick={() => setMode("text")}
              variant="outline"
            >
              <Type className="size-6" />
              <span className="text-base">Generate from Text</span>
            </Button>
            <Button
              className="h-auto flex-col gap-3 py-6"
              onClick={() => setMode("youtube")}
              variant="outline"
            >
              <Youtube className="size-6" />
              <span className="text-base">YouTube to Note</span>
            </Button>
            <Button
              className="h-auto flex-col gap-3 py-6"
              onClick={() => setMode("web")}
              variant="outline"
            >
              <Globe className="size-6" />
              <span className="text-base">Webpage to Note</span>
            </Button>
          </div>
        )}

        {mode === "file" && (
          <div className="space-y-4">
            <Button
              className="mb-2"
              onClick={handleBack}
              size="sm"
              variant="ghost"
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
              className="mb-2"
              onClick={handleBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <TextInputForm onSuccess={handleSuccess} />
          </div>
        )}

        {mode === "web" && (
          <div className="space-y-4">
            <Button
              className="mb-2"
              onClick={handleBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <WebpageInputForm onSuccess={handleSuccess} />
          </div>
        )}

        {mode === "youtube" && (
          <div className="space-y-4">
            <Button
              className="mb-2"
              onClick={handleBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <YouTubeInputForm onSuccess={handleSuccess} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
