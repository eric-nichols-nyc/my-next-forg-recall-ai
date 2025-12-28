// Load environment variables from .env file when running as a script
// This must happen before any imports that use environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

// Load .env from the current working directory (apps/rag-youtube/.env)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { ChatAnthropic } from "@langchain/anthropic";
import { Document } from "@langchain/core/documents";
import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { END, MemorySaver, MessageGraph, START } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { z } from "zod";
import { keys } from "../lib/keys";
import data from "./data.js";
import { vectorStore } from "./embeddings";

const video1 = data[0];
/**
 * LangGraph Agent using ChatAnthropic
 *
 * This agent uses Anthropic's Claude model via LangGraph for stateful,
 * multi-step reasoning and tool use.
 */

/**
 * Text splitter configuration for processing long documents and transcripts
 * Optimized for YouTube transcripts and other text content
 */
export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

/**
 * Split text into chunks for processing
 *
 * @param text - The text to split
 * @param options - Optional configuration for chunk size and overlap
 * @returns Array of text chunks
 */
export async function splitText(
  text: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }
): Promise<string[]> {
  if (options?.chunkSize || options?.chunkOverlap) {
    const customSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize ?? 1000,
      chunkOverlap: options.chunkOverlap ?? 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
    return await customSplitter.splitText(text);
  }

  return await textSplitter.splitText(text);
}

/**
 * Split text into LangChain Document objects with metadata
 *
 * @param text - The text to split
 * @param metadata - Optional metadata to attach to each chunk
 * @returns Array of LangChain Document instances
 */
export async function splitTextIntoDocuments(
  text: string,
  metadata?: Record<string, unknown>
): Promise<Document[]> {
  const chunks = await textSplitter.splitText(text);

  return chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk,
        metadata: metadata ?? { video_id: video1.video_id },
      })
  );
}

/**
 * Tool: Search Vector Store
 * Searches the vector store for relevant chunks from the video transcript
 */
const searchVectorStoreTool = new DynamicStructuredTool({
  name: "search_video_transcript",
  description:
    "Search the video transcript for relevant information. Use this tool when you need to find specific information about the video content, topics discussed, or details mentioned in the transcript.",
  schema: z.object({
    query: z
      .string()
      .describe(
        "The search query or topic to search for in the video transcript"
      ),
    k: z
      .number()
      .optional()
      .default(5)
      .describe("Number of relevant chunks to return (default: 5)"),
  }),
  func: async ({ query, k = 5 }) => {
    // Get more results than needed to account for filtering
    const allResults = await vectorStore.similaritySearchWithScore(
      query,
      k * 3
    );

    // Filter results to only include chunks with the current video_id
    const targetVideoId = video1.video_id || "unknown";
    const filteredResults = allResults.filter(([doc]) => {
      const docVideoId = doc.metadata.video_id || doc.metadata.videoId;
      return docVideoId === targetVideoId;
    });

    // Take only the top k results after filtering
    const results = filteredResults.slice(0, k);

    if (results.length === 0) {
      return `No relevant information found in the video transcript for video ID: ${targetVideoId}.`;
    }

    // Format results as a readable string
    const formattedResults = results
      .map(
        ([doc, score], index) =>
          `[Chunk ${index + 1}, Relevance: ${score.toFixed(3)}]\n${doc.pageContent}\n`
      )
      .join("\n---\n\n");

    return `Found ${results.length} relevant chunks from video ${targetVideoId}:\n\n${formattedResults}`;
  },
});

/**
 * Initialize the ChatAnthropic model with tools
 */
function createModel() {
  const apiKey = keys().ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Please set it in your environment variables."
    );
  }

  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
    apiKey,
  });

  // Bind the tool to the model
  return model.bindTools([searchVectorStoreTool]);
}

/**
 * Node: Call the LLM
 * This node processes the current state and generates a response
 * MessageGraph expects nodes to return a message directly
 */
function callModel(state: { messages: BaseMessage[] }) {
  const model = createModel();
  const { messages } = state;

  // MessageGraph handles message aggregation, so return the message directly
  return model.invoke(messages);
}

/**
 * Node: Execute Tools
 * Executes tool calls from the AI message and returns tool results
 */
async function executeTools(state: { messages: BaseMessage[] }) {
  const { messages } = state;
  const lastMessage = messages.at(-1);

  if (!(lastMessage instanceof AIMessage)) {
    throw new Error("Last message is not an AI message");
  }

  if (!lastMessage.tool_calls) {
    throw new Error("No tool calls found in the last message");
  }

  // Execute all tool calls
  const toolResults = await Promise.all(
    lastMessage.tool_calls.map(async (toolCall) => {
      // Only handle our search_video_transcript tool
      if (toolCall.name !== "search_video_transcript") {
        return new ToolMessage({
          content: `Unknown tool: ${toolCall.name}`,
          tool_call_id: toolCall.id ?? "",
        });
      }

      const args = toolCall.args as { query: string; k?: number };
      const result = await searchVectorStoreTool.invoke(args);

      return new ToolMessage({
        content: result,
        tool_call_id: toolCall.id ?? "",
      });
    })
  );

  return toolResults;
}

/**
 * Node: Should continue?
 * Determines if the agent should continue processing or end
 * MessageGraph passes messages array directly to conditional functions
 */
function shouldContinue(messages: BaseMessage[]): string {
  const lastMessage = messages.at(-1);

  // If the last message is from the AI and has tool calls, execute tools
  if (lastMessage instanceof AIMessage) {
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    }
    return "end";
  }

  // If the last message is a tool result, continue to agent
  if (lastMessage instanceof ToolMessage) {
    return "continue";
  }

  return "continue";
}

/**
 * Memory/Checkpoint saver for conversation history
 * Uses LangGraph's built-in MemorySaver for in-memory conversation persistence
 */
export const memory = new MemorySaver();

/**
 * Create the LangGraph workflow with tool support and memory
 */
function createAgentGraph() {
  // Use MessageGraph which is designed for message-based workflows
  const workflow = new MessageGraph();

  // Add nodes
  workflow.addNode("agent", callModel);
  workflow.addNode("tools", executeTools);

  // Set entry point - connect START to agent node
  workflow.addEdge(START, "agent" as never);

  // Add conditional edge from agent - can go to tools, continue, or end
  workflow.addConditionalEdges("agent" as never, shouldContinue, {
    tools: "tools" as never,
    continue: "agent" as never,
    end: END,
  });

  // After tools execute, always go back to agent
  workflow.addEdge("tools" as never, "agent" as never);

  // Compile the graph with memory checkpointer
  return workflow.compile({ checkpointer: memory });
}

/**
 * Create and export the agent instance
 * Using explicit type to avoid TypeScript inference issues with internal LangChain types
 */
// biome-ignore lint/suspicious/noExplicitAny: LangGraph compiled graph type is complex and not easily expressible
export const agent: any = createAgentGraph();

/**
 * Run the agent with a user message
 * Uses LangGraph's MemorySaver for conversation history
 *
 * @param message - The user's message
 * @param threadId - Optional thread ID for conversation continuity (default: "default")
 * @returns The agent's response
 */
export function runAgent(
  message: string,
  threadId = "default"
): Promise<unknown> {
  const config = { configurable: { thread_id: threadId } };

  return agent.invoke({ messages: [new HumanMessage(message)] }, config);
}

/**
 * Ask a question about the video transcript
 * This is a convenience function that uses the RAG agent to answer questions
 * Uses LangGraph's MemorySaver for conversation history
 *
 * @param question - The question to ask about the video
 * @param threadId - Optional thread ID for conversation continuity (default: "default")
 * @returns The agent's answer based on relevant chunks from the transcript
 */
/**
 * Extract text content from an AIMessage
 */
function extractMessageContent(message: AIMessage): string | null {
  const content = message.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const textContent = content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n");
    if (textContent.trim()) {
      return textContent;
    }
  }
  return null;
}

export async function askAboutVideo(
  question: string,
  threadId = "default"
): Promise<string> {
  const systemPrompt = `You are a helpful, conversational assistant that answers questions about video transcripts.

When a user asks a question:
1. Use the search_video_transcript tool to find relevant information from the transcript
2. After receiving the tool results, provide a natural, conversational answer based on what you found
3. Write as if you're having a friendly conversation - be clear, helpful, and engaging
4. Don't just repeat the tool results verbatim - synthesize the information into a coherent answer
5. If the tool doesn't find relevant information, let the user know politely`;

  const config = { configurable: { thread_id: threadId } };

  // Check if this is the first message in the thread
  const checkpoint = await memory.get(config);
  const hasMessages = checkpoint?.channel_values?.messages;

  const messages = hasMessages
    ? [new HumanMessage(question)]
    : [new HumanMessage(`${systemPrompt}\n\nUser's question: ${question}`)];

  const result = await agent.invoke({ messages }, config);

  // Extract the final AI message - find the last AIMessage with actual content
  // The result from MessageGraph should have a messages array
  const resultMessages =
    result.messages || (Array.isArray(result) ? result : []);

  // Find the last AIMessage that has content AND no tool calls (the final response)
  // Skip any AIMessages that only have tool calls (those are intermediate steps)
  for (let i = resultMessages.length - 1; i >= 0; i--) {
    const msg = resultMessages[i];
    // Only return messages that have content and no pending tool calls
    // This ensures we get the final synthesized response, not an intermediate tool-calling message
    if (
      msg instanceof AIMessage &&
      (!msg.tool_calls || msg.tool_calls.length === 0)
    ) {
      const content = extractMessageContent(msg);
      if (content && content.trim().length > 0) {
        return content;
      }
    }
  }

  // Fallback: if no final response found, return error
  return "I couldn't generate a response. The agent may not have completed processing. Please try again.";
}

/**
 * Stream the agent's response
 *
 * @param message - The user's message
 * @returns An async generator of agent responses
 */
export async function* streamAgent(message: string) {
  const initialState = {
    messages: [new HumanMessage(message)],
  };

  const stream = await agent.stream(initialState);

  for await (const chunk of stream) {
    yield chunk;
  }
}

/**
 * Process video1 transcript: create documents, split into chunks, embed them, and add to vector store
 * Returns LangChain Document instances and the vector store
 */
export async function processVideo1Transcript() {
  // Extract transcript from video1
  if (!video1?.transcript) {
    console.error("Video1 transcript not found");
    return;
  }

  const transcript = video1.transcript;
  console.log(
    "📝 Original transcript length:",
    transcript.length,
    "characters"
  );
  console.log(
    "📝 Original transcript preview:",
    transcript.substring(0, 200),
    "...\n"
  );

  // Split transcript into Document instances with metadata
  const documents = await splitTextIntoDocuments(transcript, {
    source: "video1",
    videoId: video1.video_id || "unknown",
    timestamp: new Date().toISOString(),
  });

  console.log("✂️  Total documents created:", documents.length);
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );

  // Log all documents
  documents.forEach((doc, index) => {
    console.log(`📄 Document ${index + 1}/${documents.length}:`);
    console.log(`   Length: ${doc.pageContent.length} characters`);
    console.log("   Metadata:", doc.metadata);
    console.log("   Content:", doc.pageContent);
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    );
  });

  // Embed chunks and add to vector store
  console.log("🔢 Embedding documents and adding to vector store...\n");
  await vectorStore.addDocuments(documents);
  console.log(
    `✅ Successfully added ${documents.length} embedded documents to vector store!\n`
  );

  console.log("✅ Transcript processing completed!\n");

  return { documents, vectorStore };
}

/**
 * Perform a similarity search on the vector store
 * Filters results to only include chunks from the current video
 * @param query - The search query/topic to search for
 * @param k - Number of results to return (default: 5)
 * @returns Array of documents with similarity scores
 */
export async function searchSimilarDocuments(query: string, k = 5) {
  console.log(`🔍 Searching for: "${query}"\n`);

  const targetVideoId = video1.video_id || "unknown";
  console.log(`📹 Filtering for video ID: ${targetVideoId}\n`);

  // Get more results than needed to account for filtering
  const allResults = await vectorStore.similaritySearchWithScore(query, k * 3);

  // Filter results to only include chunks with the current video_id
  const filteredResults = allResults.filter(([doc]) => {
    const docVideoId = doc.metadata.video_id || doc.metadata.videoId;
    return docVideoId === targetVideoId;
  });

  // Take only the top k results after filtering
  const results = filteredResults.slice(0, k);

  console.log(`📊 Found ${results.length} similar documents:\n`);
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );

  for (let index = 0; index < results.length; index++) {
    const [doc, score] = results[index];
    console.log(
      `🎯 Result ${index + 1}/${results.length} (Similarity Score: ${score.toFixed(4)}):`
    );
    console.log("   Metadata:", doc.metadata);
    console.log("   Content:", doc.pageContent);
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    );
  }

  return results;
}

// Uncomment the line below to automatically process and log chunks when this module is executed directly
// This will process video1 transcript, split it into chunks, embed them, and perform a similarity search
// Check if running as a script (works with both node and tsx)
const isMainModule =
  require.main === module ||
  process.argv[1]?.includes("agent.ts") ||
  process.argv[1]?.endsWith("agent.ts") ||
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  (async () => {
    try {
      console.log("🚀 Starting script execution...\n");
      // Process and embed the transcript
      const result = await processVideo1Transcript();

      if (result) {
        // Perform a similarity search for a topic
        // You can change this query to search for different topics
        console.log("\n🔍 Running searchSimilarDocuments...\n");
        await searchSimilarDocuments(
          "Next.js performance and development speed",
          5
        );
        console.log("\n✅ searchSimilarDocuments completed\n");

        // Test the search tool directly
        console.log("\n🔧 Testing search tool directly...\n");
        try {
          const toolResult = await searchVectorStoreTool.invoke({
            query: "Why is Next.js slow?",
            k: 3,
          });
          console.log("📋 Tool Result:\n", toolResult);
        } catch (toolError) {
          console.error("❌ Tool Error:", toolError);
        }
      } else {
        console.log("⚠️  No result from processVideo1Transcript");
      }
      console.log("\n✅ Script execution completed!\n");
    } catch (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  })();
} else {
  console.log("ℹ️  Module loaded as import, skipping script execution");
}
