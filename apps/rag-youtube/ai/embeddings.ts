// Load environment variables from .env file when running as a script
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

// Load .env from the current working directory (apps/rag-youtube/.env)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { FakeVectorStore } from "@langchain/core/utils/testing";
import { OpenAIEmbeddings } from "@langchain/openai";
import { keys } from "../lib/keys";

/**
 * OpenAI Embeddings configuration
 * Used for generating vector embeddings from text chunks
 */
function createEmbeddings() {
  const apiKey = keys().OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  return new OpenAIEmbeddings({
    model: "text-embedding-3-large",
    // With the `text-embedding-3` class of models,
    // you can specify the size of the embeddings you want returned.
    // dimensions: 1024, // Uncomment to use custom dimensions
    openAIApiKey: apiKey,
  });
}

/**
 * OpenAI Embeddings instance
 * Used for generating vector embeddings from text chunks
 */
export const embeddings = createEmbeddings();

/**
 * Memory Vector Store
 * In-memory vector store for storing and retrieving embedded document chunks
 *
 * Note: This is a singleton instance. To create a new vector store for different data,
 * use: new FakeVectorStore(embeddings)
 */
export const vectorStore = new FakeVectorStore(embeddings);

