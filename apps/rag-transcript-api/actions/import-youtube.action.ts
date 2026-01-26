"use server";

import { database } from "@repo/prisma-neon";
import { generateText } from "ai";
import { YoutubeTranscript } from "youtube-transcript-plus";
import { z } from "zod";
import { model } from "@/lib/ai/models";
import { processTranscript } from "@/lib/transcript-processor";
import transcriptApiData from "@/public/transcript-api-data/response_1769446258692.json";
import { getAuthenticatedUser } from "./auth.action";
import { fetchYouTubeTranscript } from "./transcript-api.actions";

type TranscriptItem = {
  text?: string;
  offset?: number;
  start?: number;
  duration?: number;
};

type ProcessedSegment = {
  ordinal: number;
  startSec: number;
  endSec: number;
  text: string;
};

const Input = z.object({
  url: z.string().url(),
});

async function summarizeTranscript(opts: {
  title: string;
  url: string;
  transcript: string;
}) {
  const cappedTranscript = opts.transcript.slice(0, 25_000);

  const prompt = [
    "Create concise study notes from a YouTube transcript.",
    "Return ONLY markdown (no code fences).",
    "Do not invent facts.",
    "",
    `# ${opts.title}`,
    `**Source:** ${opts.url}`,
    "",
    "## Overview",
    "## Key Concepts",
    "## Practical Takeaways",
    "",
    "Transcript:",
    cappedTranscript,
  ].join("\n");

  const result = await generateText({
    model,
    prompt,
    maxOutputTokens: 2000,
  });

  return result.text.trim();
}

export async function importYoutube(input: z.infer<typeof Input>) {
  const { url } = Input.parse(input);
  const user = await getAuthenticatedUser();

  // 1. Fetch video metadata first to get title (required)
  let videoTitle: string | undefined;

  const { isDevelopment, useTestData } = getEnvironment();

  // Extract title from test data if using test data
  if (isDevelopment && useTestData) {
    videoTitle = extractTitleFromMetadata(transcriptApiData.metadata);
  } else {
    // Fetch metadata from API
    try {
      const vidMetadata = await fetchYouTubeTranscript(url, {
        sendMetadata: true,
      });
      // Extract title from metadata (structure may vary by API)
      if (vidMetadata.success) {
        videoTitle = extractTitleFromMetadata(vidMetadata.metadata);
      }
    } catch (error) {
      console.error("Failed to fetch video metadata:", error);
      throw new Error("Failed to fetch video metadata. Title is required.");
    }
  }

  // Title is required - throw error if not found
  if (!videoTitle) {
    throw new Error("Video title is required but could not be retrieved.");
  }

  // 2. Create Source + Note immediately
  const source = await database.source.create({
    data: {
      type: "youtube",
      url,
      title: videoTitle,
      ownerId: user.id,
    },
    select: { id: true, ownerId: true },
  });

  const note = await database.note.create({
    data: {
      ownerId: user.id,
      sourceId: source.id,
      title: videoTitle,
      summaryMd: "Importing transcript…",
    },
    select: { id: true },
  });

  // 3. Fetch transcript
  const raw = await fetchTranscriptData(url, isDevelopment, useTestData);

  const segments = processTranscriptSegments(raw);

  // 3. Save SourceText
  await database.sourceText.createMany({
    data: segments.map((s) => ({
      ownerId: source.ownerId,
      sourceId: source.id,
      ordinal: s.ordinal,
      startSec: s.startSec,
      endSec: s.endSec,
      text: s.text,
    })),
  });

  // 4. Summarize
  // videoTitle is guaranteed to be set at this point due to earlier validation
  if (!videoTitle) {
    throw new Error("Video title is required but was not set.");
  }
  const finalTitle: string = videoTitle; // Type guard ensures string type

  const transcriptPlain = segments.map((s) => s.text).join(" ");
  const summaryMd = await summarizeTranscript({
    title: finalTitle,
    url,
    transcript: transcriptPlain,
  });

  await database.note.update({
    where: { id: note.id },
    data: { title: finalTitle, summaryMd },
  });

  // 5. Process transcript: chunk, embed, and store using LangChain
  // This uses the transcript processor utility which:
  // - Chunks segments (preserving boundaries and timestamps)
  // - Creates LangChain Documents
  // - Generates embeddings
  // - Stores in both database and vector store
  const { chunkCount } = await processTranscript({
    segments: segments.map((s) => ({
      ordinal: s.ordinal,
      startSec: s.startSec,
      endSec: s.endSec,
      text: s.text,
    })),
    sourceId: source.id,
    ownerId: source.ownerId,
    sourceType: "youtube",
    url,
  });

  console.log(
    `✅ Processed transcript: ${chunkCount} chunks created and embedded`
  );

  return { noteId: note.id };
}
//===========Helper functions
function getEnvironment() {
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "development";
  const useTestData =
    process.env.TESTING === "true" || process.env.TESTING === "1";

  return { isDevelopment, useTestData };
}

async function fetchTranscriptData(
  url: string,
  isDevelopment: boolean,
  useTestData: boolean
): Promise<TranscriptItem[]> {
  if (isDevelopment && useTestData) {
    return transcriptApiData.transcript;
  }

  if (isDevelopment && !useTestData) {
    return await YoutubeTranscript.fetchTranscript(url);
  }

  // Production: use transcript API
  const vid = await fetchYouTubeTranscript(url, { sendMetadata: true });
  if (!(vid.success && vid.transcript)) {
    throw new Error(vid.error || "Failed to fetch transcript");
  }

  return vid.transcript;
}

function extractTitleFromMetadata(metadata: unknown): string | undefined {
  if (
    metadata &&
    typeof metadata === "object" &&
    metadata !== null &&
    "title" in metadata &&
    typeof metadata.title === "string"
  ) {
    return metadata.title;
  }
}

function processTranscriptSegments(raw: TranscriptItem[]): ProcessedSegment[] {
  return raw
    .map((t: TranscriptItem, i: number) => {
      const text = String(t.text ?? "").trim();
      if (!text) {
        return null;
      }

      // Handle offset or start
      const startSec = Math.floor((t.offset ?? t.start ?? 0) / 1000);
      const endSec = startSec + Math.ceil((t.duration ?? 0) / 1000);

      return { ordinal: i, startSec, endSec, text };
    })
    .filter((s): s is ProcessedSegment => s !== null);
}
