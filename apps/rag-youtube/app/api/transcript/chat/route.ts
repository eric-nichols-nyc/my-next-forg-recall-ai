import { database } from "@repo/prisma-neon";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { model } from "@/lib/ai/models";
import { embeddings } from "@/lib/embeddings";

/**
 * Extract text content from a UIMessage
 */
function extractTextFromMessage(message: UIMessage): string {
  // UIMessage uses a parts array structure
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }

  return "";
}

/**
 * POST /api/transcript/chat
 *
 * Chat route that uses vector search to answer questions about transcripts.
 * Searches chunks filtered by sourceId and uses them as context for the LLM.
 */
export async function POST(request: Request) {
  try {
    const { messages, sourceId }: { messages: UIMessage[]; sourceId: string } =
      await request.json();

    if (!sourceId) {
      return new Response(JSON.stringify({ error: "sourceId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one message is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the last user message as the search query
    const lastMessage = messages.at(-1);
    if (!lastMessage) {
      return new Response(JSON.stringify({ error: "No messages found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const query = extractTextFromMessage(lastMessage);

    if (!query.trim()) {
      return new Response(
        JSON.stringify({ error: "Last message must contain text content" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify chunks with embeddings exist in the database
    const chunksWithEmbeddings = await database.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*) as count
      FROM "Chunk"
      WHERE "sourceId" = ${sourceId}::uuid
      AND embedding IS NOT NULL
    `;
    const embeddingCount = Number(chunksWithEmbeddings[0]?.count || 0);

    // Also check total chunks with embeddings (any sourceId)
    const totalChunksWithEmbeddings = await database.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*) as count
      FROM "Chunk"
      WHERE embedding IS NOT NULL
    `;
    const totalEmbeddingCount = Number(
      totalChunksWithEmbeddings[0]?.count || 0
    );

    console.log(
      `Database check: ${embeddingCount} chunks with embeddings for sourceId ${sourceId}, ${totalEmbeddingCount} total chunks with embeddings in "Chunk" table`
    );

    if (totalEmbeddingCount === 0) {
      console.error(
        "ERROR: No chunks with embeddings found in Chunk table! Vector search will fail."
      );
    }

    // Vector search directly on "Chunk" (Prisma). PGVectorStore uses "chunk" which is
    // not populated by processTranscript, so we query "Chunk" here.
    const queryEmbedding = await embeddings.embedQuery(query);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    const rows = await database.$queryRawUnsafe<
      Array<{ id: string; text: string | null; score: number }>
    >(
      `SELECT
        id,
        text,
        1 - (embedding <=> $1::vector(3072)) as score
      FROM "Chunk"
      WHERE "sourceId" = $2::uuid
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector(3072)
      LIMIT 10`,
      vectorString,
      sourceId
    );

    // Map to [doc, score] for compatibility with existing context formatting
    const results: [{ pageContent: string }, number][] = rows.map((r) => [
      { pageContent: r.text ?? "" },
      r.score,
    ]);

    console.log(
      `Found ${results.length} relevant chunks for sourceId: ${sourceId}`
    );

    // Format chunks as context
    let context = "";
    if (results.length > 0) {
      context = results
        .map(
          ([doc, score], i) =>
            `[Chunk ${i + 1}, Relevance Score: ${score.toFixed(3)}]\n${doc.pageContent}`
        )
        .join("\n\n---\n\n");
    }

    // Build system prompt with retrieved context
    const systemPrompt =
      results.length > 0
        ? `You are a helpful assistant answering questions about a video transcript.

Use the following relevant transcript chunks to answer the user's question:

${context}

Answer based on the provided chunks. Be accurate, helpful, and cite specific parts when relevant. If the chunks don't contain enough information to fully answer the question, say so.`
        : "You are a helpful assistant. The user is asking about a transcript, but no relevant information was found in the transcript chunks. Please let them know that the transcript doesn't contain information relevant to their question.";

    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      system: systemPrompt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in transcript chat route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process transcript chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
