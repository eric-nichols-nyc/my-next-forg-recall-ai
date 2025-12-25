import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
// @ts-expect-error - pdf-parse v2 has complex exports
import pdfParse from "pdf-parse";
import { model } from "@/lib/ai/models";
import { type QuizData, quizSchema } from "@/types";

/**
 * Extract PDF text from the last user message's file attachments
 */
async function extractPdfText(messages: UIMessage[]): Promise<string | null> {
  // Find the last user message
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage) {
    return null;
  }

  // Look for file parts in the message
  for (const part of lastUserMessage.parts) {
    if (part.type === "file" && part.mediaType === "application/pdf") {
      try {
        // Extract base64 data from data URL
        const base64Data = part.url.split(",")[1];
        if (!base64Data) {
          continue;
        }

        // Decode base64 to buffer
        const pdfBuffer = Buffer.from(base64Data, "base64");

        // Parse PDF to extract text using pdf-parse
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
      } catch (error) {
        console.error("Error parsing PDF:", error);
      }
    }
  }

  return null;
}

/**
 * POST /api/chat/generate-quiz
 *
 * This route handles PDF uploads and generates quizzes from the content.
 */
export async function POST(request: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await request.json();

    // Extract PDF text from attachments
    const pdfText = await extractPdfText(messages);

    // Check if the user provided a text message with the PDF
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const userTextMessage =
      lastUserMessage?.parts
        .filter((p) => p.type === "text")
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim() || "";

    // Create the generateQuiz tool
    const generateQuizTool = tool({
      description:
        "Generate a 4-question multiple choice quiz based on document content. Call this tool when the user explicitly asks for a quiz to be generated.",
      inputSchema: quizSchema,
      execute: (quizData: QuizData): QuizData => {
        // The AI generates the quiz data, we just return it
        return quizData;
      },
    });

    // Build system prompt based on context
    let systemPrompt: string;

    if (pdfText && userTextMessage) {
      // PDF uploaded WITH a message - follow the user's instruction
      systemPrompt = `You are a quiz generator assistant. The user has uploaded a document with the following content:

<document_content>
${pdfText}
</document_content>

If the user asks you to generate a quiz, create a 4-question multiple choice quiz based on this document content. Each question should:
- Test understanding of key concepts from the document
- Have exactly 4 answer options
- Have one clearly correct answer

Use the generateQuiz tool to return the quiz in the proper structured format.`;
    } else if (pdfText && !userTextMessage) {
      // PDF uploaded WITHOUT a message - ask for clarification
      systemPrompt = `You are a quiz generator assistant. The user has uploaded a PDF document but didn't provide any instructions.

Ask the user what they would like you to do with the document. For example, they might want you to:
- Generate a quiz based on the content
- Summarize the document
- Answer questions about it

Be friendly and helpful in asking for clarification.`;
    } else {
      // No PDF uploaded
      systemPrompt =
        "You are a quiz generator assistant. When users upload a PDF document, you can create a 4-question multiple choice quiz based on its content. Please ask the user to upload a PDF document to generate a quiz.";
    }

    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      system: systemPrompt,
      tools: {
        generateQuiz: generateQuizTool,
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in generate-quiz route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process quiz generation request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
