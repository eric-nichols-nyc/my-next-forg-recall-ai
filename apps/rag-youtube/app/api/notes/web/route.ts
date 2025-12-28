import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";
import { generateText } from "ai";
import Firecrawl from "@mendable/firecrawl-js";
import { NextResponse } from "next/server";
import { model } from "@/lib/ai/models";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o-mini";

type User = {
  id: string;
  email?: string;
  [key: string]: unknown;
};

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

const truncateContent = (content: string, max = 12_000): string => {
  if (content.length > max) {
    return `${content.slice(0, max)}\n\n...[truncated]`;
  }
  return content;
};

// Regex patterns for title extraction
const HEADING_PATTERN = /^#+\s+(.+)$/m;
const MARKDOWN_FORMAT_PATTERN = /^[#*-]\s*/;

// Helper to extract title from markdown summary
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

async function scrapeWebsite(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FireCrawl API key is not configured. Please set FIRECRAWL_API_KEY environment variable."
    );
  }

  try {
    const app = new Firecrawl({ apiKey });

    // Scrape the website and get markdown content
    const scrapeResult = await app.scrape(url, {
      formats: ["markdown"],
    });

    if (!scrapeResult.markdown || scrapeResult.markdown.trim().length === 0) {
      throw new Error("Failed to extract content from the website. The page may be empty or inaccessible.");
    }

    return scrapeResult.markdown;
  } catch (error) {
    console.error("Error scraping website:", error);
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes("API key")) {
        throw new Error("FireCrawl API key is invalid or missing.");
      }
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        throw new Error("Request timed out. The website may be slow or unreachable.");
      }
      if (error.message.includes("404") || error.message.includes("not found")) {
        throw new Error("Website not found. Please check the URL.");
      }
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
    throw new Error("Failed to scrape website. Please try again later.");
  }
}

async function generateSummary(content: string, url?: string): Promise<string> {
  const prompt = [
    "You are a note-taking assistant that summarizes web content.",
    "Return a concise markdown summary with headings and bullet points.",
    url ? `Source URL: ${url}` : null,
    "Web content:",
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

async function createNoteFromWeb(
  user: User,
  content: string,
  summaryMd: string,
  url: string
): Promise<{ sourceId: string; noteId: string }> {
  try {
    const sourceId = crypto.randomUUID();
    const title = extractTitleFromSummary(summaryMd);

    await database.source.create({
      data: {
        id: sourceId,
        ownerId: user.id,
        type: "web",
        url,
        filename: null,
        sha256: null,
        title,
        texts: {
          create: {
            ownerId: user.id,
            ordinal: 0,
            text: content,
          },
        },
        notes: {
          create: {
            ownerId: user.id,
            summaryMd,
            title,
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
    console.error("Error creating note from web:", error);
    throw new Error("Failed to save note to database. Please try again.");
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json(
        { error: "URL is required and cannot be empty." },
        { status: 400 }
      );
    }

    // Validate URL format
    let validUrl: string;
    try {
      const urlObj = new URL(url.trim());
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        return NextResponse.json(
          { error: "URL must use http:// or https:// protocol." },
          { status: 400 }
        );
      }
      validUrl = urlObj.toString();
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format. Please provide a valid URL." },
        { status: 400 }
      );
    }

    // Scrape the website
    let scrapedContent: string;
    try {
      scrapedContent = await scrapeWebsite(validUrl);
    } catch (error) {
      console.error("Error scraping website:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to scrape website.",
        },
        { status: 422 }
      );
    }

    // Generate summary
    let summaryMd: string;
    try {
      summaryMd = await generateSummary(scrapedContent, validUrl);
    } catch (error) {
      console.error("Error generating summary:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate summary.",
        },
        { status: 503 }
      );
    }

    // Save to database
    let dbResult: { sourceId: string; noteId: string };
    try {
      dbResult = await createNoteFromWeb(user, scrapedContent, summaryMd, validUrl);
    } catch (error) {
      console.error("Error saving note:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to save note to database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      noteId: dbResult.noteId,
      sourceId: dbResult.sourceId,
      summary: summaryMd,
    });
  } catch (error) {
    console.error("Unexpected error creating note from web:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

