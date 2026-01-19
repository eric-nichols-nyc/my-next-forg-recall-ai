/**
 * Transcript Processing Utility
 *
 * This module handles processing YouTube transcripts using LangChain:
 * - Creates chunks from transcript segments (preserving timestamps)
 * - Generates embeddings using LangChain
 * - Stores chunks in both database and vector store
 *
 * Architecture:
 * - Processing logic is separated from actions.ts for reusability
 * - Uses LangChain's Document and embedding infrastructure
 * - Maintains compatibility with existing segment-based chunking
 */

import { Document } from "@langchain/core/documents";
import { database } from "@repo/prisma-neon";
import { embeddings, vectorStore } from "@/ai/embeddings";

export type TranscriptSegment = {
  ordinal: number;
  startSec: number | null;
  endSec: number | null;
  text: string;
};

export type ChunkMetadata = {
  ordinalStart: number;
  ordinalEnd: number;
  startSec: number | null;
  endSec: number | null;
  sourceId: string;
  sourceType?: string;
  url?: string;
};

/**
 * Convert timestamp seconds to readable format
 */
function toTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Groups transcript segments into chunks
 * Preserves segment boundaries - never splits a segment
 *
 * @param segments - Array of transcript segments with timestamps
 * @param maxChars - Maximum characters per chunk (default: 3500)
 * @returns Array of chunk objects with text and metadata
 */
export function chunkSegments(
  segments: TranscriptSegment[],
  maxChars = 3500
): Array<{
  chunkIndex: number;
  text: string;
  metadata: Omit<ChunkMetadata, "sourceId" | "sourceType" | "url">;
}> {
  const chunks: Array<{
    chunkIndex: number;
    text: string;
    metadata: Omit<ChunkMetadata, "sourceId" | "sourceType" | "url">;
  }> = [];

  let buffer: string[] = [];
  let bufferLen = 0;
  let chunkIndex = 0;

  let ordinalStart = segments[0]?.ordinal ?? 0;
  let startSec = segments[0]?.startSec ?? null;
  let endSec = segments[0]?.endSec ?? null;

  for (const s of segments) {
    const line =
      s.startSec !== null
        ? `- [${toTimestamp(s.startSec)}] ${s.text}`
        : `- ${s.text}`;

    if (bufferLen + line.length > maxChars && buffer.length) {
      chunks.push({
        chunkIndex,
        text: buffer.join("\n"),
        metadata: {
          ordinalStart,
          ordinalEnd: s.ordinal - 1,
          startSec,
          endSec,
        },
      });

      chunkIndex += 1;
      buffer = [];
      bufferLen = 0;
      ordinalStart = s.ordinal;
      startSec = s.startSec ?? null;
    }

    buffer.push(line);
    bufferLen += line.length;
    if (s.endSec !== null) {
      endSec = s.endSec;
    }
  }

  if (buffer.length) {
    const lastSegment = segments.at(-1);
    chunks.push({
      chunkIndex,
      text: buffer.join("\n"),
      metadata: {
        ordinalStart,
        ordinalEnd: lastSegment?.ordinal ?? segments[0]?.ordinal ?? 0,
        startSec,
        endSec,
      },
    });
  }

  return chunks;
}

/**
 * Convert chunks to LangChain Document objects
 * This prepares chunks for embedding generation
 *
 * @param chunks - Chunks created from segments
 * @param metadata - Additional metadata to attach to all chunks
 * @returns Array of LangChain Document instances
 */
export function chunksToDocuments(
  chunks: Array<{
    chunkIndex: number;
    text: string;
    metadata: Omit<ChunkMetadata, "sourceId" | "sourceType" | "url">;
  }>,
  metadata: Pick<ChunkMetadata, "sourceId" | "sourceType" | "url">
): Document[] {
  return chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.text,
        metadata: {
          ...chunk.metadata,
          ...metadata,
          chunkIndex: chunk.chunkIndex,
        },
      })
  );
}

/**
 * Process transcript segments: chunk, embed, and store
 *
 * This is the main processing function that:
 * 1. Chunks segments (preserving boundaries)
 * 2. Creates LangChain Documents
 * 3. Generates embeddings
 * 4. Stores in database (Chunk table)
 * 5. Stores in vector store (for RAG/search)
 *
 * @param params - Processing parameters
 * @returns Processing result with chunk count
 */
export async function processTranscript({
  segments,
  sourceId,
  ownerId,
  sourceType: _sourceType = "youtube",
  url: _url,
  maxChars = 3500,
}: {
  segments: TranscriptSegment[];
  sourceId: string;
  ownerId: string;
  sourceType?: string;
  url?: string;
  maxChars?: number;
}): Promise<{
  chunkCount: number;
  chunkIds: string[];
}> {
  // Step 1: Chunk segments (preserves boundaries and timestamps)
  const chunks = chunkSegments(segments, maxChars);
  console.log(
    `📦 Created ${chunks.length} chunks from ${segments.length} segments`
  );

  // Step 2: Store chunks in database first (before generating embeddings)
  // Delete existing chunks for this source
  await database.chunk.deleteMany({ where: { sourceId } });

  // Create chunks in database
  // Include sourceId in metadata so PGVector can filter by it
  const chunkRows = await database.chunk.createMany({
    data: chunks.map((c) => ({
      ownerId,
      sourceId,
      chunkIndex: c.chunkIndex,
      text: c.text,
      metadata: {
        ...c.metadata,
        sourceId,
        sourceType: _sourceType,
        url: _url,
      },
    })),
    skipDuplicates: true,
  });

  console.log(`💾 Stored ${chunkRows.count} chunks in database`);

  // Step 3: Get the created chunks with their IDs
  const createdChunks = await database.chunk.findMany({
    where: { sourceId },
    select: { id: true, chunkIndex: true, text: true },
    orderBy: { chunkIndex: "asc" },
  });

  // Step 4: Generate embeddings for all chunks in batch (more efficient)
  console.log("🔢 Generating embeddings...");
  const textsToEmbed = createdChunks
    .map((chunk) => chunk.text)
    .filter((text): text is string => text !== null);

  if (textsToEmbed.length === 0) {
    console.warn("⚠️  No text content to embed");
    return {
      chunkCount: chunks.length,
      chunkIds: createdChunks.map((c) => c.id),
    };
  }

  // Generate embeddings in batch (more efficient than one-by-one)
  const embeddingVectors = await embeddings.embedDocuments(textsToEmbed);
  console.log(`✅ Generated ${embeddingVectors.length} embeddings`);

  // Step 5: Update chunks with embeddings using raw SQL (Prisma doesn't support vector type directly)
  // We need to use a raw query to update the embedding column
  for (let i = 0; i < createdChunks.length; i++) {
    const chunk = createdChunks[i];
    if (!chunk.text || i >= embeddingVectors.length) {
      continue;
    }

    const embedding = embeddingVectors[i];
    // Convert embedding array to PostgreSQL vector format: [1,2,3]::vector
    // Use Prisma's parameterized query for safety
    const vectorString = `[${embedding.join(",")}]`;
    await database.$executeRawUnsafe(
      `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
      vectorString,
      chunk.id
    );
  }

  console.log(`✅ Updated ${embeddingVectors.length} chunks with embeddings`);

  // Note: Embeddings are now stored in the database.
  // The vector store (PGVector) can read them directly from the Chunk table
  // for similarity search. No need to call addDocuments again since we've
  // already stored the embeddings in the same table that PGVector uses.

  return {
    chunkCount: chunks.length,
    chunkIds: createdChunks.map((c) => c.id),
  };
}

/**
 * Alternative: Process transcript using LangChain's RecursiveCharacterTextSplitter
 * This is more aggressive and may split across segment boundaries
 * Use this if you want pure LangChain chunking (loses some timestamp precision)
 *
 * @param transcriptText - Full transcript as plain text
 * @param metadata - Metadata to attach to chunks
 * @param options - Chunking options
 */
export async function processTranscriptWithLangChainSplitter({
  transcriptText,
  sourceId,
  ownerId,
  sourceType = "youtube",
  url,
  chunkSize: _chunkSize = 1000,
  chunkOverlap: _chunkOverlap = 200,
}: {
  transcriptText: string;
  sourceId: string;
  ownerId: string;
  sourceType?: string;
  url?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}): Promise<{
  chunkCount: number;
  chunkIds: string[];
}> {
  // Import here to avoid circular dependencies
  const { textSplitter } = await import("@/ai/agent");

  // Split text using LangChain's splitter
  const textChunks = await textSplitter.splitText(transcriptText);

  // Create documents with metadata
  const documents = textChunks.map(
    (chunk: string, index: number) =>
      new Document({
        pageContent: chunk,
        metadata: {
          sourceId,
          sourceType,
          url,
          chunkIndex: index,
        },
      })
  );

  console.log(`📦 Created ${documents.length} chunks using LangChain splitter`);

  // Generate embeddings and store in vector store
  await vectorStore.addDocuments(documents);

  // Store in database
  await database.chunk.deleteMany({ where: { sourceId } });

  await database.chunk.createMany({
    data: documents.map((doc: Document, index: number) => ({
      ownerId,
      sourceId,
      chunkIndex: index,
      text: doc.pageContent,
      metadata: doc.metadata,
    })),
  });

  const createdChunks = await database.chunk.findMany({
    where: { sourceId },
    select: { id: true },
    orderBy: { chunkIndex: "asc" },
  });

  return {
    chunkCount: documents.length,
    chunkIds: createdChunks.map((c) => c.id),
  };
}
