import crypto from "node:crypto";
import { database } from "@repo/prisma-neon";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Expected payload structure from Bright Data webhook
 * Bright Data returns an array with video data objects
 */
type BrightDataVideoRecord = {
  url?: string; // YouTube URL
  video_id?: string; // Video ID
  title?: string;
  transcript?: string; // Raw transcript as string
  formatted_transcript?: Array<{
    text?: string;
    start?: number;
    duration?: number;
    offset?: number;
    [key: string]: unknown;
  }>;
  // Metadata passed from initial request (may be at root level or in record)
  sourceId?: string;
  ownerId?: string;
  [key: string]: unknown;
};

type BrightDataWebhookPayload = BrightDataVideoRecord | BrightDataVideoRecord[];

/**
 * Verify webhook signature from Bright Data (optional but recommended)
 * Bright Data may provide a signature header - adjust based on their docs
 * Uncomment and use in POST handler if needed
 */
// biome-ignore lint/correctness/noUnusedVariables: Reserved for future use
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  // Adjust this based on Bright Data's signature algorithm
  // Common patterns: HMAC-SHA256, HMAC-SHA1, etc.
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Regex pattern defined at top level for performance
const VIDEO_ID_URL_PATTERN =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Extract video ID from URL
 */
function extractVideoIdFromUrl(url: string): string | null {
  const match = url.match(VIDEO_ID_URL_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Get or create source based on payload
 */
async function getOrCreateSource(record: BrightDataVideoRecord): Promise<{
  sourceId: string;
  ownerId: string;
  existingSource: { id: string; ownerId: string; url: string | null } | null;
}> {
  const { sourceId, ownerId, video_id: videoId, url: videoUrl } = record;

  // First, try to find by sourceId if provided
  if (sourceId && typeof sourceId === "string") {
    const existingSource = await database.source.findUnique({
      where: { id: sourceId },
      select: { id: true, ownerId: true, url: true },
    });

    if (existingSource) {
      return {
        sourceId: existingSource.id,
        ownerId: existingSource.ownerId,
        existingSource,
      };
    }
    // If sourceId provided but not found, throw error (shouldn't happen in normal flow)
    throw new Error("Source not found");
  }

  // If no sourceId, try to find by video URL
  const fallbackVideoUrl =
    videoUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);

  if (!fallbackVideoUrl) {
    throw new Error(
      "videoId or videoUrl is required when sourceId is not provided"
    );
  }

  // Try to find existing source by URL (created when user submitted the request)
  const existingSourceByUrl = await database.source.findFirst({
    where: {
      url: fallbackVideoUrl,
      type: "youtube",
    },
    select: { id: true, ownerId: true, url: true },
    orderBy: { createdAt: "desc" }, // Get most recent
  });

  if (existingSourceByUrl) {
    return {
      sourceId: existingSourceByUrl.id,
      ownerId: existingSourceByUrl.ownerId,
      existingSource: existingSourceByUrl,
    };
  }

  // Create new source as fallback - default ownerId if not provided
  const DEFAULT_OWNER_ID = "dc211fbb-fb9b-45f3-adc8-570ad79bbffa";
  const finalOwnerId =
    ownerId && typeof ownerId === "string" ? ownerId : DEFAULT_OWNER_ID;

  const newSourceId = crypto.randomUUID();
  await database.source.create({
    data: {
      id: newSourceId,
      ownerId: finalOwnerId,
      type: "youtube",
      url: fallbackVideoUrl,
    },
  });

  return {
    sourceId: newSourceId,
    ownerId: finalOwnerId,
    existingSource: null,
  };
}

/**
 * Extract and normalize transcript from Bright Data format
 */
function extractTranscript(
  record: BrightDataVideoRecord
): Array<{ text: string; offset?: number; duration?: number }> {
  // Prefer formatted_transcript if available
  if (
    record.formatted_transcript &&
    Array.isArray(record.formatted_transcript)
  ) {
    return record.formatted_transcript
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        text: item.text || String(item),
        offset: item.offset ?? (item.start ? item.start * 1000 : undefined),
        duration: item.duration ? item.duration * 1000 : undefined,
      }));
  }

  // Fallback to raw transcript string
  if (record.transcript && typeof record.transcript === "string") {
    // Split transcript string into segments (every ~3 seconds)
    const SEGMENT_REGEX = /\n\n/g;
    const segments = record.transcript.split(SEGMENT_REGEX).filter(Boolean);
    return segments.map((text, index) => ({
      text: text.trim(),
      offset: index * 3000,
      duration: 3000,
    }));
  }

  throw new Error("No transcript data found in payload");
}

/**
 * Determine final video URL
 */
function determineVideoUrl(
  videoUrl: string | undefined,
  videoId: string | undefined,
  existingUrl: string | undefined
): string {
  if (videoUrl) {
    return videoUrl;
  }
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (existingUrl) {
    return existingUrl;
  }
  throw new Error("videoUrl is required");
}

/**
 * Save transcript to existing source (created when user submitted request)
 */
async function saveTranscriptToExistingSource(
  sourceId: string,
  videoUrl: string,
  transcript: Array<{
    text: string;
    offset?: number;
    duration?: number;
    startSec?: number;
    endSec?: number;
  }>,
  ownerId: string
): Promise<{ sourceId: string; noteId: string }> {
  // Update source URL if needed
  await database.source.update({
    where: { id: sourceId },
    data: { url: videoUrl },
  });

  // Add transcript texts to existing source
  await database.sourceText.createMany({
    data: transcript.map((item, index) => ({
      ownerId,
      sourceId,
      ordinal: index,
      text: item.text,
      startSec:
        item.startSec ?? (item.offset ? Math.floor(item.offset / 1000) : null),
      endSec:
        item.endSec ??
        (item.offset && item.duration
          ? Math.floor((item.offset + item.duration) / 1000)
          : null),
    })),
  });

  // Check if a note exists
  const note = await database.note.findUnique({
    where: { sourceId },
  });

  return {
    sourceId,
    noteId: note?.id ?? sourceId, // Fallback to sourceId if no note
  };
}

/**
 * Process webhook payload and save transcript
 */
async function processWebhookPayload(record: BrightDataVideoRecord): Promise<{
  sourceId: string;
  noteId: string;
  videoId?: string;
  videoUrl: string;
  transcriptLength: number;
}> {
  // Extract and normalize transcript
  const transcript = extractTranscript(record);

  // Get or create source
  const sourceInfo = await getOrCreateSource(record);

  // Determine final video URL (convert null to undefined)
  const existingUrl = sourceInfo.existingSource?.url;
  const finalVideoUrl = determineVideoUrl(
    record.url,
    record.video_id,
    existingUrl ?? undefined
  );

  // Update source URL and title if needed
  const updateData: { url?: string; title?: string } = {};
  if (
    !sourceInfo.existingSource?.url ||
    sourceInfo.existingSource.url !== finalVideoUrl
  ) {
    updateData.url = finalVideoUrl;
  }
  if (record.title) {
    updateData.title = record.title;
  }
  if (Object.keys(updateData).length > 0) {
    await database.source.update({
      where: { id: sourceInfo.sourceId },
      data: updateData,
    });
  }

  // Save transcript to existing source
  const dbResult = await saveTranscriptToExistingSource(
    sourceInfo.sourceId,
    finalVideoUrl,
    transcript,
    sourceInfo.ownerId
  );

  const responseVideoId =
    record.video_id || extractVideoIdFromUrl(finalVideoUrl);
  return {
    ...dbResult,
    videoId: responseVideoId ?? undefined,
    videoUrl: finalVideoUrl,
    transcriptLength: transcript.length,
  };
}

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification (if needed)
    const rawBody = await request.text();
    const payload: BrightDataWebhookPayload = JSON.parse(rawBody);

    // Optional: Verify webhook signature
    // Uncomment and adjust based on Bright Data's security requirements
    /*
    const signature = request.headers.get("x-bright-data-signature") ||
                      request.headers.get("x-signature") ||
                      null;
    const webhookSecret = process.env.BRIGHT_DATA_WEBHOOK_SECRET;

    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
    */

    // Bright Data sends an array - extract the first record
    let record: BrightDataVideoRecord;
    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return NextResponse.json(
          { error: "Payload array is empty" },
          { status: 400 }
        );
      }
      record = payload[0];
    } else {
      record = payload;
    }

    // Process webhook payload
    const result = await processWebhookPayload(record);

    // Return 200 OK with confirmation
    return NextResponse.json(
      {
        success: true,
        message: "Transcript saved successfully",
        sourceId: result.sourceId,
        noteId: result.noteId,
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        transcriptLength: result.transcriptLength,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing Bright Data webhook:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (errorMessage === "Source not found") {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes("required") || errorMessage.includes("Invalid")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Return 500 for unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
