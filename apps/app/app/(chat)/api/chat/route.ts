import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { model } from "@/lib/ai/models";

/**
 * POST /api/chat
 *
 * Simple chat route that answers questions about notes when noteContext is provided.
 */
export async function POST(request: Request) {
  try {
    const {
      messages,
      noteContext,
    }: { messages: UIMessage[]; noteContext?: string } = await request.json();

    // Build system prompt
    const systemPrompt = noteContext
      ? `You are a helpful assistant that answers questions about documents. The user is asking questions about the following document summary:

<document_summary>
${noteContext}
</document_summary>

Answer the user's questions based on this document content. Be helpful, accurate, and cite specific parts of the document when relevant.`
      : "You are a helpful assistant. Please ask the user to provide context or a document to discuss.";

    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      system: systemPrompt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
