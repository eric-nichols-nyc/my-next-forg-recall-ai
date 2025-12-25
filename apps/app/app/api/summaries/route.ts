import { generateText } from "ai";
// @ts-expect-error - pdf-parse v2 has complex exports
import pdfParse from "pdf-parse";
import { NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { model } from "@/lib/ai/models";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["application/pdf"]);

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

async function getPdfText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return pdfParse(buffer);
}

const truncateContent = (content: string, max = 12_000) =>
  content.length > max ? `${content.slice(0, max)}\n\n...[truncated]` : content;

export async function POST(request: Request) {
  try {
    const { session } = await neonAuth();

    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const instructions = (formData.get("instructions") as string | null)?.trim();

    if (!file || !(file instanceof File)) {
      return errorResponse("No PDF file received.");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse("Unsupported file type. Please upload a PDF.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse("File is too large. Max size is 10MB.");
    }

    const pdfData = await getPdfText(file);
    const content = pdfData.text?.trim();

    if (!content) {
      return errorResponse("Could not extract text from the PDF.");
    }

    const prompt = [
      "You are a note-taking assistant that summarizes PDF documents.",
      "Return a concise markdown summary with headings and bullet points.",
      instructions ? `Follow these user instructions: ${instructions}` : null,
      "Document content:",
      truncateContent(content),
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: 800,
    });

    const summaryId = crypto.randomUUID();
    const documentId = crypto.randomUUID();

    return NextResponse.json({
      summary: result.text,
      summaryId,
      documentId,
      pageCount: pdfData.numpages ?? undefined,
    });
  } catch (error) {
    console.error("Error creating summary", error);
    return errorResponse(
      "Unable to generate summary at this time. Please try again.",
      500
    );
  }
}
