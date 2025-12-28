import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { fetchTranscript } from "youtube-transcript-plus";
import { model } from "@/lib/ai/models";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o-mini";

// Regex patterns defined at top level for performance
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;

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

// Extract video ID from YouTube URL or return the ID if already provided
function extractVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();

  // If it's already a video ID (11 characters, alphanumeric and hyphens/underscores)
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Try to extract from various YouTube URL formats
  const match = trimmed.match(YOUTUBE_URL_PATTERN);
  if (match?.[1]) {
    return match[1];
  }

  return null;
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

type TranscriptItem = {
  text: string;
  offset: number;
  duration: number;
};

async function fetchYouTubeTranscript(
  videoId: string
): Promise<TranscriptItem[]> {
  try {
    // Start simple - just fetch the transcript without proxy
    // We can add proxy support later if needed for production
    const transcript = await fetchTranscript(videoId);

    return transcript;
  } catch (error) {
    console.error("Error fetching YouTube transcript:", error);
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (
        errorMsg.includes("transcript disabled") ||
        errorMsg.includes("not available")
      ) {
        throw new Error(
          "Transcript is not available for this video. The video may not have captions enabled."
        );
      }
      if (
        errorMsg.includes("private video") ||
        errorMsg.includes("unavailable")
      ) {
        throw new Error(
          "Video is private or unavailable. Please check the video URL."
        );
      }
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }
    throw new Error("Failed to fetch transcript. Please try again later.");
  }
}

async function generateSummary(
  content: string,
  videoUrl?: string
): Promise<string> {
  const prompt = [
    "You are a note-taking assistant that summarizes video transcript content.",
    "Return a concise markdown summary with headings and bullet points.",
    videoUrl ? `Source URL: ${videoUrl}` : null,
    "Transcript content:",
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

async function createNoteFromYouTube(
  user: User,
  transcript: TranscriptItem[],
  summaryMd: string,
  videoUrl: string
): Promise<{ sourceId: string; noteId: string }> {
  try {
    const sourceId = crypto.randomUUID();
    const title = extractTitleFromSummary(summaryMd);

    // Create source with transcript segments
    await database.source.create({
      data: {
        id: sourceId,
        ownerId: user.id,
        type: "youtube",
        url: videoUrl,
        filename: null,
        sha256: null,
        title,
        texts: {
          create: transcript.map((item, index) => ({
            ownerId: user.id,
            ordinal: index,
            text: item.text,
            startSec: Math.floor(item.offset / 1000),
            endSec: Math.floor((item.offset + item.duration) / 1000),
          })),
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
    console.error("Error creating note from YouTube:", error);
    throw new Error("Failed to save note to database. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser().catch((error) => {
      if (error instanceof Error && error.message === "Unauthorized") {
        throw error;
      }
      throw new Error("Failed to verify authentication");
    });

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json(
        { error: "YouTube URL or video ID is required and cannot be empty." },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "Invalid YouTube URL or video ID. Please provide a valid YouTube URL or video ID.",
        },
        { status: 400 }
      );
    }

    // Construct canonical YouTube URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Fetch transcript
    const transcript = await fetchYouTubeTranscript(videoId).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch transcript.";
      return NextResponse.json({ error: errorMessage }, { status: 422 });
    });

    if (transcript instanceof NextResponse) {
      return transcript;
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: "No transcript available for this video." },
        { status: 422 }
      );
    }

    // Combine transcript into text
    const transcriptText = transcript.map((item) => item.text).join(" ");

    // Generate summary
    const summaryMd = await generateSummary(transcriptText, videoUrl).catch(
      (error) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate summary.";
        return NextResponse.json({ error: errorMessage }, { status: 503 });
      }
    );

    if (summaryMd instanceof NextResponse) {
      return summaryMd;
    }

    // Save to database
    const dbResult = await createNoteFromYouTube(
      user,
      transcript,
      summaryMd,
      videoUrl
    ).catch((error) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save note to database.";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    });

    if (dbResult instanceof NextResponse) {
      return dbResult;
    }

    return NextResponse.json({
      noteId: dbResult.noteId,
      sourceId: dbResult.sourceId,
      summary: summaryMd,
    });
  } catch (error) {
    console.error("Unexpected error creating note from YouTube:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
