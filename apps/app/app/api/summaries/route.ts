import { createHash } from "node:crypto";
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
  title: string | null;
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
    // Check if the method exists and is callable
    if (typeof pdfParser.getRawTextContent !== "function") {
      throw new Error("getRawTextContent is not a function");
    }

    const rawText = pdfParser.getRawTextContent();

    // Validate the result before using it
    if (
      typeof rawText === "string" &&
      rawText.length > 0 &&
      rawText.length <= 50_000_000 &&
      Number.isFinite(rawText.length)
    ) {
      return rawText;
    }

    // If we got here, the result is invalid, try alternatives
    if (typeof rawText === "string" && rawText.length > 50_000_000) {
      console.log(
        "getRawTextContent() returned text that is too large, trying alternatives"
      );
    } else if (typeof rawText !== "string") {
      console.log(
        "getRawTextContent() returned non-string value, trying alternatives"
      );
    }
  } catch (error) {
    // Handle specific error types
    if (
      error instanceof RangeError &&
      error.message.includes("Invalid count value")
    ) {
      console.log(
        "getRawTextContent() encountered a RangeError (likely Infinity issue), trying alternatives"
      );
    } else {
      console.log("getRawTextContent() failed, trying alternatives:", error);
    }
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

// Regex patterns for title extraction (defined at top level for performance)
const HEADING_PATTERN = /^#+\s+(.+)$/m;
const MARKDOWN_FORMAT_PATTERN = /^[#*-]\s*/;

// Helper to extract title from markdown summary
// Tries to find the first heading, otherwise uses first line or a default
const extractTitleFromSummary = (summaryMd: string): string => {
  // Try to find the first markdown heading (# Title or ## Title)
  const headingMatch = summaryMd.match(HEADING_PATTERN);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  // Try to find the first non-empty line
  const firstLine = summaryMd
    .split("\n")
    .find((line) => line.trim().length > 0);
  if (firstLine) {
    // Remove markdown formatting and limit length
    const cleaned = firstLine.replace(MARKDOWN_FORMAT_PATTERN, "").trim();
    if (cleaned.length > 0 && cleaned.length <= 100) {
      return cleaned;
    }
    // If too long, truncate
    if (cleaned.length > 100) {
      return `${cleaned.slice(0, 97)}...`;
    }
  }

  // Default fallback
  return "Untitled Note";
};

const MODEL_NAME = "gpt-4o-mini";

type User = {
  id: string;
  email?: string;
  [key: string]: unknown;
};

async function extractAndValidatePdfText(file: File): Promise<string> {
  let extractedText: string;
  try {
    extractedText = await getPdfText(file);
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to extract text from PDF. The file may be corrupted or encrypted."
    );
  }

  const content = extractedText.trim();
  if (content.length === 0) {
    throw new Error("Could not extract text from the PDF.");
  }
  return content;
}

async function generateSummary(
  content: string,
  instructions: string | null | undefined
): Promise<string> {
  const prompt = [
    "You are a note-taking assistant that summarizes PDF documents.",
    "Return a concise markdown summary with headings and bullet points.",
    instructions ? `Follow these user instructions: ${instructions}` : null,
    "Document content:",
    truncateContent(content),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: 800,
    });
    return result.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error(
      "Failed to generate summary. The AI service may be unavailable. Please try again later."
    );
  }
}

async function calculateFileHash(file: File): Promise<string> {
  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    return createHash("sha256").update(fileBuffer).digest("hex");
  } catch (error) {
    console.error("Error processing file:", error);
    throw new Error("Failed to process file. Please try again.");
  }
}

async function getAuthenticatedUser(): Promise<User> {
  try {
    const sessionResult = await getSession();
    const user = sessionResult.user;
    if (!user) {
      throw new Error("Unauthorized");
    }
    return user as User;
  } catch (error) {
    console.error("Error getting session:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    throw new Error("Failed to verify authentication.");
  }
}

async function findExistingSource(sha256: string) {
  try {
    return await database.source.findUnique({
      where: { sha256 },
    });
  } catch (error) {
    console.error("Error checking for existing source:", error);
    throw new Error("Database error. Please try again.");
  }
}

function validateFile(file: unknown): asserts file is File {
  if (!file) {
    throw new Error("No PDF file received.");
  }

  if (!(file instanceof File)) {
    throw new Error("No PDF file received.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Please upload a PDF.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large. Max size is 10MB.");
  }
}

function getErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (error.message.includes("Unauthorized")) {
    return 401;
  }
  if (error.message.includes("extract")) {
    return 422;
  }
  if (error.message.includes("generate")) {
    return 503;
  }
  return 500;
}

async function processPdfUpload(
  file: File,
  instructions: string | null | undefined
): Promise<{
  content: string;
  summaryMd: string;
  sha256: string;
  user: User;
  existingSource: { id: string } | null;
}> {
  const content = await extractAndValidatePdfText(file);
  const summaryMd = await generateSummary(content, instructions);
  const sha256 = await calculateFileHash(file);
  const user = await getAuthenticatedUser();
  const existingSource = await findExistingSource(sha256);

  return { content, summaryMd, sha256, user, existingSource };
}

type SavePdfDataParams = {
  existingSource: { id: string } | null;
  user: User;
  content: string;
  summaryMd: string;
  filename: string;
  sha256: string;
  title?: string | null;
};

async function savePdfData(
  params: SavePdfDataParams
): Promise<{ sourceId: string; noteId: string }> {
  const sourceData = {
    ownerId: params.user.id,
    content: params.content,
    summaryMd: params.summaryMd,
    title: params.title,
  };

  try {
    return params.existingSource
      ? await handleExistingSource(params.existingSource.id, sourceData)
      : await createNewSource({
          ...sourceData,
          filename: params.filename,
          sha256: params.sha256,
        });
  } catch (error) {
    console.error("Error saving to database:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to save PDF data. Please try again.");
  }
}

async function saveOrUpdateSourceText(
  sourceId: string,
  ownerId: string,
  content: string
): Promise<void> {
  try {
    const existingText = await database.sourceText.findFirst({
      where: { sourceId, ordinal: 0 },
    });

    if (!existingText || existingText.text !== content) {
      if (existingText) {
        await database.sourceText.update({
          where: { id: existingText.id },
          data: { text: content },
        });
      } else {
        await database.sourceText.create({
          data: {
            ownerId,
            sourceId,
            ordinal: 0,
            text: content,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error saving source text:", error);
    throw new Error("Failed to save PDF text to database. Please try again.");
  }
}

async function createOrUpdateNote(
  sourceId: string,
  ownerId: string,
  summaryMd: string,
  title?: string | null
): Promise<string> {
  try {
    const noteTitle = title ?? extractTitleFromSummary(summaryMd);
    const existingNote = await database.note.findUnique({
      where: { sourceId },
    });

    if (existingNote) {
      const updatedNote = await database.note.update({
        where: { id: existingNote.id },
        data: {
          summaryMd,
          title: noteTitle,
          model: MODEL_NAME,
        },
      });
      return updatedNote.id;
    }

    const newNote = await database.note.create({
      data: {
        ownerId,
        sourceId,
        summaryMd,
        title: noteTitle,
        model: MODEL_NAME,
      },
    });
    return newNote.id;
  } catch (error) {
    console.error("Error creating or updating note:", error);
    throw new Error("Failed to save summary to database. Please try again.");
  }
}

type SourceData = {
  ownerId: string;
  content: string;
  summaryMd: string;
  title?: string | null;
};

async function handleExistingSource(
  sourceId: string,
  data: SourceData
): Promise<{ sourceId: string; noteId: string }> {
  try {
    await saveOrUpdateSourceText(sourceId, data.ownerId, data.content);
    const noteId = await createOrUpdateNote(
      sourceId,
      data.ownerId,
      data.summaryMd,
      data.title
    );
    return { sourceId, noteId };
  } catch (error) {
    console.error("Error handling existing source:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to update existing PDF record.");
  }
}

type NewSourceData = SourceData & {
  filename: string;
  sha256: string;
};

async function createNewSource(
  data: NewSourceData
): Promise<{ sourceId: string; noteId: string }> {
  try {
    const sourceId = crypto.randomUUID();

    await database.source.create({
      data: {
        id: sourceId,
        ownerId: data.ownerId,
        type: "pdf",
        filename: data.filename,
        sha256: data.sha256,
        texts: {
          create: {
            ownerId: data.ownerId,
            ordinal: 0,
            text: data.content,
          },
        },
        notes: {
          create: {
            ownerId: data.ownerId,
            summaryMd: data.summaryMd,
            title: data.title ?? extractTitleFromSummary(data.summaryMd),
            model: MODEL_NAME,
          },
        },
      },
    });

    const createdNote = await database.note.findUnique({
      where: { sourceId },
    });
    const noteId = createdNote?.id ?? crypto.randomUUID();

    return { sourceId, noteId };
  } catch (error) {
    console.error("Error creating new source:", error);
    // Check for Prisma-specific errors
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error(
        "A PDF with this content already exists. Please try uploading a different file."
      );
    }
    throw new Error("Failed to save PDF to database. Please try again.");
  }
}

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
    const title = (formData.get("title") as string | null)?.trim() || null;

    try {
      validateFile(file);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid file.",
        400
      );
    }

    let processedData: Awaited<ReturnType<typeof processPdfUpload>>;
    try {
      processedData = await processPdfUpload(file, instructions);
    } catch (error) {
      const status = getErrorStatus(error);
      const message =
        error instanceof Error ? error.message : "Failed to process PDF.";
      return errorResponse(message, status);
    }

    let dbResult: { sourceId: string; noteId: string };
    try {
      dbResult = await savePdfData({
        existingSource: processedData.existingSource,
        user: processedData.user,
        content: processedData.content,
        summaryMd: processedData.summaryMd,
        filename: file.name,
        sha256: processedData.sha256,
        title,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Failed to save PDF data.",
        500
      );
    }

    return NextResponse.json({
      summary: processedData.summaryMd,
      summaryId: dbResult.noteId,
      documentId: dbResult.sourceId,
      pageCount: undefined,
    });
  } catch (error) {
    console.error("Unexpected error creating summary:", error);
    // Only return generic error if it's not already handled
    if (error instanceof Error && error.message.includes("Failed to")) {
      throw error; // Re-throw handled errors
    }
    return errorResponse(
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}

export async function GET() {
  try {
    let user: User;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify authentication",
        },
        { status: 401 }
      );
    }

    let notes: NoteWithSource[];
    try {
      notes = (await database.note.findMany({
        where: { ownerId: user.id },
        select: {
          id: true,
          sourceId: true,
          title: true,
          summaryMd: true,
          createdAt: true,
          source: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })) as NoteWithSource[];
    } catch (error) {
      console.error("Error fetching notes from database:", error);
      return NextResponse.json(
        { error: "Database error. Please try again later." },
        { status: 500 }
      );
    }

    const summaries = notes.map((note: NoteWithSource) => ({
      id: note.id,
      sourceId: note.sourceId,
      title: note.title ?? note.source?.title ?? "Untitled Note",
      createdAt: note.createdAt,
      summary: note.summaryMd,
    }));

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Unexpected error fetching summaries:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
