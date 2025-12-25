import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { model } from "@/lib/ai/models";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["application/pdf"]);

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

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
    const extractedText = formData.get("extractedText") as string | null;
    const instructions = (
      formData.get("instructions") as string | null
    )?.trim();

    // Validate file if provided (for size/type checking)
    if (file && file instanceof File) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return errorResponse("Unsupported file type. Please upload a PDF.");
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return errorResponse("File is too large. Max size is 10MB.");
      }
    }

    // Use extracted text from client, or return error if not provided
    if (!extractedText) {
      return errorResponse("PDF text extraction failed. Please try again.");
    }

    const content = extractedText.trim();

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
      pageCount: undefined,
    });
  } catch (error) {
    console.error("Error creating summary", error);
    return errorResponse(
      "Unable to generate summary at this time. Please try again.",
      500
    );
  }
}
