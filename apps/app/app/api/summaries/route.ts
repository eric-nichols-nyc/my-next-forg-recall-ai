import { generateText, type UIMessage } from "ai";
import { neonAuth } from "@neondatabase/neon-js/auth/next";
// @ts-expect-error - pdf-parse v2 has complex exports
import pdfParse from "pdf-parse";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { model } from "@/lib/ai/models";
import { Prisma, database, SourceType } from "@repo/prisma-neon";

type ParsedPdf = {
  buffer: Buffer;
  text: string;
  numPages?: number;
  filename?: string;
};

function splitPdfIntoChunks(text: string, numPages?: number) {
  const pages = text
    .split(/\f+/)
    .map((pageText) => pageText.trim())
    .filter(Boolean);

  if (pages.length > 1) {
    return pages.map((pageText, index) => ({
      text: pageText,
      pageNumber: index + 1,
    }));
  }

  if (pages.length === 1) {
    return [
      {
        text: pages[0],
        pageNumber: numPages && numPages > 0 ? 1 : undefined,
      },
    ];
  }

  if (numPages && numPages > 1) {
    const chunkSize = Math.ceil(text.length / numPages);
    const splits = [];
    for (let i = 0; i < numPages; i++) {
      const slice = text.slice(i * chunkSize, (i + 1) * chunkSize).trim();
      if (slice.length > 0) {
        splits.push({
          text: slice,
          pageNumber: i + 1,
        });
      }
    }

    if (splits.length > 0) {
      return splits;
    }
  }

  return [
    {
      text,
      pageNumber: numPages && numPages > 0 ? 1 : undefined,
    },
  ];
}

async function parsePdfBuffer(pdfBuffer: Buffer, filename?: string) {
  const pdfData = await pdfParse(pdfBuffer);

  const cleanText = pdfData.text.trim();
  if (!cleanText) {
    return null;
  }

  return {
    buffer: pdfBuffer,
    text: cleanText,
    numPages: pdfData.numpages,
    filename,
  } satisfies ParsedPdf;
}

async function parseJsonPayload(request: Request): Promise<ParsedPdf | null> {
  const { messages }: { messages?: UIMessage[] } = await request.json();

  if (!Array.isArray(messages)) {
    return null;
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    return null;
  }

  for (const part of lastUserMessage.parts ?? []) {
    if (part.type === "file" && part.mediaType === "application/pdf") {
      try {
        const dataUrl = (part as { url?: string }).url;
        const base64Data = dataUrl?.split(",")[1];
        if (!base64Data) {
          continue;
        }

        const pdfBuffer = Buffer.from(base64Data, "base64");
        const filename = (part as { name?: string }).name ?? "uploaded.pdf";
        const parsed = await parsePdfBuffer(pdfBuffer, filename);
        if (parsed) {
          return parsed;
        }
      } catch (error) {
        console.error("Failed to parse PDF from messages:", error);
        throw error;
      }
    }
  }

  return null;
}

async function parseMultipartPayload(request: Request): Promise<ParsedPdf | null> {
  const formData = await request.formData();
  const file =
    formData.get("file") instanceof File
      ? (formData.get("file") as File)
      : formData.get("pdf") instanceof File
        ? (formData.get("pdf") as File)
        : null;

  if (!file) {
    return null;
  }

  if (file.type && file.type !== "application/pdf") {
    throw new Error("Uploaded file must be a PDF");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  return parsePdfBuffer(pdfBuffer, file.name || "uploaded.pdf");
}

export async function POST(request: Request) {
  try {
    const { session, user } = await neonAuth();
    if (!session || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let parsedPdf: ParsedPdf | null = null;

    try {
      if (contentType.includes("application/json")) {
        parsedPdf = await parseJsonPayload(request);
      } else if (contentType.includes("multipart/form-data")) {
        parsedPdf = await parseMultipartPayload(request);
      } else {
        return NextResponse.json(
          { error: "Unsupported content type" },
          { status: 415 }
        );
      }
    } catch (error) {
      console.error("Error parsing request payload:", error);
      return NextResponse.json(
        { error: "Invalid PDF data provided" },
        { status: 422 }
      );
    }

    if (!parsedPdf) {
      return NextResponse.json(
        { error: "No PDF content found in request" },
        { status: 400 }
      );
    }

    const { buffer, text, numPages, filename } = parsedPdf;
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const source = await database.source
      .create({
        data: {
          ownerId: user.id,
          type: SourceType.pdf,
          filename: filename ?? "uploaded.pdf",
          sha256,
        },
      })
      .catch((error) => {
        console.error("Failed to save source:", error);

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return null;
        }

        throw error;
      });

    if (!source) {
      return NextResponse.json(
        { error: "A PDF with this content has already been uploaded" },
        { status: 409 }
      );
    }

    const pageChunks = splitPdfIntoChunks(text, numPages);
    await database.sourceText.createMany({
      data: pageChunks.map((chunk, index) => ({
        ownerId: user.id,
        sourceId: source.id,
        ordinal: index,
        pageNumber: chunk.pageNumber,
        text: chunk.text,
      })),
    });

    const summaryResult = await generateText({
      model,
      system:
        "You are a concise assistant that writes clear, well-structured markdown summaries.",
      prompt: `Summarize the following PDF content. Focus on the key ideas and keep the markdown suitable for notes.\n\n${text}`,
    });

    const modelName =
      (summaryResult as { response?: { modelId?: string } }).response?.modelId ??
      (model as { modelId?: string }).modelId ??
      "unknown";

    const note = await database.note.create({
      data: {
        ownerId: user.id,
        sourceId: source.id,
        summaryMd: summaryResult.text,
        model: modelName,
      },
    });

    return NextResponse.json({
      sourceId: source.id,
      noteId: note.id,
      summary: note.summaryMd,
    });
  } catch (error) {
    console.error("Error handling summary request:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
