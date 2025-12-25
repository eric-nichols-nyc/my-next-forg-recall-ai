import { promises as fs } from "node:fs";
import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { v4 as uuidv4 } from "uuid";
import { model } from "@/lib/ai/models";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["application/pdf"]);

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

type NoteWithSource = {
  id: string;
  sourceId: string;
  summaryMd: string;
  createdAt: Date;
  source: { title: string | null } | null;
};

// Helper to extract text from a single text object
function extractTextFromTextObject(text: unknown): string | null {
  if (!text || typeof text !== "object") {
    return null;
  }
  // biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
  const textObj = text as any;
  const textValue =
    textObj.R || textObj.T || textObj.text || textObj.content || textObj.str;
  return textValue && typeof textValue === "string" ? textValue : null;
}

// Helper to extract text from a page
// biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
function extractTextFromPage(page: any): string[] {
  const textParts: string[] = [];

  if (page.texts && Array.isArray(page.texts)) {
    for (const text of page.texts) {
      const textValue = extractTextFromTextObject(text);
      if (textValue) {
        textParts.push(textValue);
      }
    }
  }

  if (page.text && typeof page.text === "string") {
    textParts.push(page.text);
  }

  return textParts;
}

// Helper to extract text from form fields
// biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
function extractTextFromFormFields(formImage: any): string[] {
  const textParts: string[] = [];
  const pages = formImage?.Pages;
  if (!Array.isArray(pages)) {
    return textParts;
  }

  for (const page of pages) {
    const fields = page.Fields;
    if (!Array.isArray(fields)) {
      continue;
    }

    for (const field of fields) {
      if (field.value && typeof field.value === "string") {
        textParts.push(field.value);
      }
    }
  }

  return textParts;
}

// Helper function to extract text from PDF pages structure
// biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
function extractTextFromPages(pdfParser: any): string {
  const textParts: string[] = [];
  const rawText = pdfParser.RawText ?? pdfParser.data ?? pdfParser;
  const pages = rawText.pages ?? rawText.Pages ?? [];

  for (const page of pages) {
    textParts.push(...extractTextFromPage(page));
  }

  // Try form fields if available
  if (rawText.formImage) {
    textParts.push(...extractTextFromFormFields(rawText.formImage));
  }

  return textParts.join(" ");
}

// Helper to try extracting text from JSON data as last resort
// biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
function extractTextFromJsonData(data: any): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  try {
    const dataStr = JSON.stringify(data);
    if (dataStr.length <= 100) {
      return null;
    }

    const textMatches = dataStr.match(/"([A-Za-z0-9\s]{10,})"/g);
    if (!textMatches || textMatches.length === 0) {
      return null;
    }

    const extracted = textMatches
      .map((m) => m.slice(1, -1))
      .filter((t) => t.length > 3)
      .join(" ");

    return extracted.trim().length > 0 ? extracted : null;
  } catch {
    return null;
  }
}

// Helper function to safely extract text from pdf2json parser
// biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
function extractTextFromParser(pdfParser: any): string {
  // Method 1: Try getRawTextContent()
  try {
    const rawText = pdfParser.getRawTextContent();
    if (
      typeof rawText === "string" &&
      rawText.length > 0 &&
      rawText.length <= 50_000_000
    ) {
      return rawText;
    }
  } catch (error) {
    console.log("getRawTextContent() failed, trying alternatives:", error);
  }

  // Method 2: Try extracting from pages structure
  try {
    const extractedText = extractTextFromPages(pdfParser);
    if (extractedText.trim().length > 0) {
      return extractedText;
    }
  } catch (error) {
    console.log("extractTextFromPages() failed:", error);
  }

  // Method 3: Try accessing data property directly
  try {
    // biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
    const data = (pdfParser as any).data;
    const jsonText = extractTextFromJsonData(data);
    if (jsonText) {
      return jsonText;
    }
  } catch (error) {
    console.log("Direct data extraction failed:", error);
  }

  throw new Error(
    "Failed to extract text from PDF. The PDF may be image-based, encrypted, or have an unsupported structure."
  );
}

async function getPdfText(file: File): Promise<string> {
  // Generate a unique filename
  const fileName = uuidv4();
  const tempFilePath = `/tmp/${fileName}.pdf`;

  try {
    // Convert ArrayBuffer to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Save the buffer as a temporary file
    await fs.writeFile(tempFilePath, fileBuffer);

    // Parse the PDF using pdf2json
    // Wrap the event-based API in a Promise
    return new Promise<string>((resolve, reject) => {
      // The reason we bypass type checks is because
      // the default type definitions for pdf2json in the npm install
      // do not allow for any constructor arguments.
      type PDFParserInstance = {
        on: (
          event: string,
          // biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
          callback: (data?: any) => void
        ) => void;
        loadPDF: (path: string) => void;
      };
      // biome-ignore lint/suspicious/noExplicitAny: pdf2json types are incomplete
      const pdfParser = new (PDFParser as any)(null, 1) as PDFParserInstance;

      pdfParser.on(
        "pdfParser_dataError",
        (errData?: { parserError?: string }) => {
          const errorMessage = errData?.parserError || "Failed to parse PDF";
          reject(new Error(errorMessage));
        }
      );

      pdfParser.on("pdfParser_dataReady", () => {
        try {
          const parsedText = extractTextFromParser(pdfParser);
          resolve(parsedText);
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("Failed to extract text from PDF")
          );
        }
      });

      pdfParser.loadPDF(tempFilePath);
    });
  } finally {
    // Clean up the temporary file
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore errors when cleaning up
    }
  }
}

const truncateContent = (content: string, max = 12_000): string => {
  if (content.length > max) {
    return `${content.slice(0, max)}\n\n...[truncated]`;
  }
  return content;
};

export async function POST(request: Request) {
  try {
    const { session } = await neonAuth();

    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const instructions = (
      formData.get("instructions") as string | null
    )?.trim();

    if (!file) {
      return errorResponse("No PDF file received.");
    }

    if (!(file instanceof File)) {
      return errorResponse("No PDF file received.");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse("Unsupported file type. Please upload a PDF.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse("File is too large. Max size is 10MB.");
    }

    const extractedText = await getPdfText(file);
    const content = extractedText.trim();

    if (content.length === 0) {
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

export async function GET() {
  try {
    const { user } = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await database.note.findMany({
      where: { ownerId: user.id },
      include: { source: true },
      orderBy: { createdAt: "desc" },
    });

    const summaries = notes.map((note: NoteWithSource) => ({
      id: note.id,
      sourceId: note.sourceId,
      title: note.source?.title ?? "Untitled source",
      createdAt: note.createdAt,
      summary: note.summaryMd,
    }));

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Error fetching summaries", error);
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}
