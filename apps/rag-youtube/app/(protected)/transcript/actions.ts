"use server";

import { database } from "@repo/prisma-neon";
import { generateText } from "ai";
import { YoutubeTranscript } from "youtube-transcript-plus";
import { z } from "zod";
import { model } from "@/lib/ai/models";
import { processTranscript } from "@/lib/transcript-processor";

const Input = z.object({
  url: z.string().url(),
});

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

  // 1. Create Source + Note immediately
  const source = await database.source.create({
    data: { type: "youtube", url, ownerId: user.id },
    select: { id: true, ownerId: true },
  });

  const note = await database.note.create({
    data: {
      ownerId: user.id,
      sourceId: source.id,
      title: "Importing…",
      summaryMd: "Importing transcript…",
    },
    select: { id: true },
  });

  // 2. Fetch transcript
  const raw = await YoutubeTranscript.fetchTranscript(url);

  type TranscriptItem = {
    text?: string;
    offset?: number;
    duration?: number;
  };

  const segments = raw
    .map((t: TranscriptItem, i: number) => {
      const text = String(t.text ?? "").trim();
      if (!text) {
        return null;
      }

      const startSec = Math.floor((t.offset ?? 0) / 1000);
      const endSec = startSec + Math.ceil((t.duration ?? 0) / 1000);

      return { ordinal: i, startSec, endSec, text };
    })
    .filter(
      (
        s
      ): s is {
        ordinal: number;
        startSec: number;
        endSec: number;
        text: string;
      } => s !== null
    );

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
  const transcriptPlain = segments.map((s) => s.text).join(" ");
  const summaryMd = await summarizeTranscript({
    title: "YouTube Note",
    url,
    transcript: transcriptPlain,
  });

  await database.note.update({
    where: { id: note.id },
    data: { title: "YouTube Note", summaryMd },
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

export async function getUserTranscripts() {
  const user = await getAuthenticatedUser();

  const transcripts = await database.source.findMany({
    where: {
      ownerId: user.id,
      type: "youtube",
    },
    include: {
      notes: {
        select: {
          id: true,
          title: true,
          summaryMd: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return transcripts.map((transcript) => ({
    id: transcript.id,
    url: transcript.url,
    title: transcript.title,
    createdAt: transcript.createdAt,
    note: transcript.notes
      ? {
          id: transcript.notes.id,
          title: transcript.notes.title,
          summaryMd: transcript.notes.summaryMd,
          createdAt: transcript.notes.createdAt,
        }
      : null,
  }));
}

const DeleteInput = z.object({
  sourceId: z.string().uuid(),
});

export async function deleteTranscript(
  input: z.infer<typeof DeleteInput>
) {
  const { sourceId } = DeleteInput.parse(input);
  const user = await getAuthenticatedUser();

  // Verify the source belongs to the user
  const source = await database.source.findFirst({
    where: {
      id: sourceId,
      ownerId: user.id,
      type: "youtube",
    },
  });

  if (!source) {
    throw new Error("Transcript not found or unauthorized");
  }

  // Delete chunks first (no cascade relationship)
  await database.chunk.deleteMany({
    where: {
      sourceId,
      ownerId: user.id,
    },
  });

  // Delete the source (cascade will delete related Note and SourceText)
  await database.source.delete({
    where: {
      id: sourceId,
    },
  });

  return { success: true };
}
