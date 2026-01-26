import crypto from "node:crypto";
import { database } from "@repo/prisma-neon";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Regex patterns defined at top level for performance
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();

  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(YOUTUBE_URL_PATTERN);
  return match?.[1] ?? null;
}

type User = {
  id: string;
  email?: string;
  [key: string]: unknown;
};

async function getAuthenticatedUser(): Promise<User> {
  const { getSession } = await import("@repo/neon-auth");
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

/**
 * Trigger Bright Data API to scrape YouTube transcript
 */
async function triggerBrightDataRequest(
  videoUrl: string,
  _sourceId: string,
  _ownerId: string
): Promise<void> {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  const datasetId = process.env.BRIGHT_DATA_DATASET_ID;
  const webhookUrl =
    process.env.BRIGHT_DATA_WEBHOOK_URL ||
    "https://26ec164108c9.ngrok-free.app/api/webhooks/bright-data";

  // Only log if there's a configuration issue

  const hasApiKey = Boolean(apiKey);
  const hasDatasetId = Boolean(datasetId);

  if (hasApiKey && hasDatasetId) {
    // Continue to API call below
  } else {
    console.error(
      "Bright Data API configuration missing. Required: BRIGHT_DATA_API_KEY, BRIGHT_DATA_DATASET_ID",
      {
        hasApiKey,
        hasDatasetId,
      }
    );
    return;
  }

  try {
    // Build request URL to match working curl command with webhook endpoint
    const encodedWebhookUrl = encodeURIComponent(webhookUrl);
    const requestUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&endpoint=${encodedWebhookUrl}&format=json&uncompressed_webhook=true&include_errors=true`;
    // Bright Data doesn't accept custom fields like sourceId/ownerId
    // We'll match by video URL when the webhook comes back
    const requestBody = [
      {
        url: videoUrl,
        country: "",
        transcription_language: "",
      },
    ];

    console.log("📤 Sending to Bright Data API:", {
      url: requestUrl,
      body: requestBody,
      note: "sourceId and ownerId not included - Bright Data doesn't accept custom fields. Will match by URL in webhook.",
      videoUrl,
    });
    // post goes to brightdata

    const triggerResponse = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (triggerResponse.ok) {
      // Success - Bright Data will send webhook when transcript is ready
    } else {
      const errorText = await triggerResponse.text();
      console.error(
        `Bright Data API error: ${triggerResponse.status} - ${errorText}`
      );
    }
  } catch (error) {
    console.error("Error triggering Bright Data request:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

/**
 * POST /api/notes/transcripts/async
 * Initiates async YouTube transcript processing via Bright Data webhook
 * Creates a Source record immediately and returns sourceId for polling
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

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

    // Create Source record immediately (without texts - will be added by webhook)
    const sourceId = crypto.randomUUID();
    try {
      await database.source.create({
        data: {
          id: sourceId,
          ownerId: user.id,
          type: "youtube",
          url: videoUrl,
          title: null, // Can be updated later if needed
        },
      });
    } catch (error) {
      console.error("Error creating source:", error);
      return NextResponse.json(
        { error: "Failed to create source record" },
        { status: 500 }
      );
    }

    // Initiate Bright Data scraping request
    // This triggers Bright Data to scrape and send webhook with transcript
    await triggerBrightDataRequest(videoUrl, sourceId, user.id);

    // Return sourceId immediately - frontend will poll for status
    return NextResponse.json({
      sourceId,
      status: "pending",
      message:
        "Transcript processing initiated. Poll /api/notes/transcripts/status/[sourceId] to check status.",
    });
  } catch (error) {
    console.error("❌ Error initiating async transcript processing:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
