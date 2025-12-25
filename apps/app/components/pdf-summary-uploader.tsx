"use client";

import type { ChatStatus, FileUIPart } from "ai";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@repo/design-system/components/ai-elements";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState } from "react";

type SummaryResponse = {
  summary: string;
  summaryId: string;
  documentId: string;
  pageCount?: number;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf"];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 KB";
  const sizes = ["Bytes", "KB", "MB", "GB"] as const;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(1)} ${sizes[i]}`;
};

const toFile = async (part: FileUIPart) => {
  if (!part.url) {
    throw new Error("Uploaded file is missing a URL to read from.");
  }

  const response = await fetch(part.url);
  const blob = await response.blob();

  return new File([blob], part.filename ?? "document.pdf", {
    type: part.mediaType ?? blob.type,
  });
};

export function PdfSummaryUploader() {
  const [summary, setSummary] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instructions, setInstructions] = useState<string>("");

  const submitStatus: ChatStatus | undefined = useMemo(() => {
    if (isSubmitting) return "submitted";
    if (error) return "error";
    return "ready";
  }, [error, isSubmitting]);

  const handlePromptInputError = (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => {
    if (err.code === "accept") {
      setError("Only PDF files can be uploaded for summaries.");
      return;
    }

    if (err.code === "max_file_size") {
      setError(`Files must be smaller than ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
      return;
    }

    if (err.code === "max_files") {
      setError("Please upload a single PDF at a time.");
      return;
    }

    setError(err.message);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    setError(null);
    setSummary(null);
    setMetadata(null);
    setIsSubmitting(true);

    try {
      if (message.files.length === 0) {
        setError("Add a PDF before requesting a summary.");
        throw new Error("No file provided");
      }

      const [filePart] = message.files;
      const file = await toFile(filePart);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Only PDF documents are supported.");
        throw new Error("Unsupported file type");
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Files must be smaller than ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
        throw new Error("File too large");
      }

      const formData = new FormData();
      formData.append("file", file);

      if (message.text.trim()) {
        formData.append("instructions", message.text.trim());
      }

      const response = await fetch("/api/summaries", {
        method: "POST",
        body: formData,
      });

      const payload: SummaryResponse & { error?: string } = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to generate a summary for this file.");
        throw new Error(payload.error ?? "Summary request failed");
      }

      setSummary(payload.summary);
      setMetadata({
        documentId: payload.documentId,
        summaryId: payload.summaryId,
        pageCount: payload.pageCount,
        summary: payload.summary,
      });
      setInstructions("");
    } catch (cause) {
      console.error("Summary upload failed", cause);
      setError((prev) =>
        prev ?? "Something went wrong while generating your summary. Please try again."
      );
      throw cause;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-muted/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>Summarize a PDF</CardTitle>
            <CardDescription>
              Drop a PDF document to generate a markdown summary and see the saved identifiers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-muted-foreground text-sm">
          <ShieldCheck className="size-4" />
          <span>Protected route — only signed-in users can request summaries.</span>
        </div>

        <PromptInput
          accept={ALLOWED_TYPES.join(",")}
          className="rounded-xl border bg-background"
          maxFileSize={MAX_FILE_SIZE_BYTES}
          maxFiles={1}
          multiple={false}
          onError={handlePromptInputError}
          onSubmit={handleSubmit}
        >
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Drop a PDF or add optional notes for the summary..."
              value={instructions}
            />
          </PromptInputBody>
          <PromptInputFooter className="border-t">
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments label="Attach PDF" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={isSubmitting}
              size="sm"
              status={submitStatus}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  Generate summary
                </>
              )}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>

        <div className="flex flex-wrap gap-3 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <FileText className="size-4" />
            <span>PDF files only</span>
          </div>
          <div className="flex items-center gap-2">
            <Upload className="size-4" />
            <span>Max size: {formatBytes(MAX_FILE_SIZE_BYTES)}</span>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {summary && metadata ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                Summary ready
                <Badge variant="secondary">{metadata.pageCount ?? "?"} pages</Badge>
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2">
                <Badge variant="outline">Summary ID: {metadata.summaryId}</Badge>
                <Badge variant="outline">Document ID: {metadata.documentId}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Separator />
              <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
                {summary}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}
