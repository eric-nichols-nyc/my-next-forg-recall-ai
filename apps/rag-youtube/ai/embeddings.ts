// Load environment variables from .env file when running as a script
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

// Load .env from the current working directory (apps/rag-youtube/.env)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
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
 * PGVector Store (lazy initialization)
 * Persistent vector store using Neon PostgreSQL database with pgvector extension
 *
 * This vector store persists embeddings in your Neon database, allowing them to
 * survive application restarts and be shared across instances.
 *
 * Make sure to enable the pgvector extension in your Neon database:
 * 1. Go to Neon Console → Your Database → Extensions
 * 2. Enable the "vector" extension
 * OR run: CREATE EXTENSION IF NOT EXISTS vector;
 *
 * Note: This uses lazy initialization - the vector store is created on first use.
 * All methods should be awaited since they may trigger initialization.
 */
let vectorStorePromise: Promise<PGVectorStore> | null = null;

function getVectorStore(): Promise<PGVectorStore> {
  if (!vectorStorePromise) {
    const databaseUrl = keys().DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is required for PGVector. " +
          "Please set it in your .env file or environment variables."
      );
    }

    vectorStorePromise = PGVectorStore.initialize(embeddings, {
      postgresConnectionOptions: {
        connectionString: databaseUrl,
      },
      tableName: "Chunk", // Using existing Chunk table
      // Note: The Chunk table must have the following columns for PGVector:
      // - id (uuid, primary key) - already exists
      // - content (text) - already exists
      // - metadata (jsonb) - needs to be added
      // - embedding (vector) - needs to be added
    });
  }

  return vectorStorePromise;
}

/**
 * Vector Store wrapper that handles async initialization
 * Provides a synchronous interface by wrapping async operations
 */
export const vectorStore = {
  async addDocuments(documents: Parameters<PGVectorStore["addDocuments"]>[0]) {
    const store = await getVectorStore();
    return store.addDocuments(documents);
  },

  async similaritySearchWithScore(
    query: string,
    k: number,
    filter?: Parameters<PGVectorStore["similaritySearchWithScore"]>[2]
  ) {
    const store = await getVectorStore();
    return store.similaritySearchWithScore(query, k, filter);
  },

  async similaritySearch(
    query: string,
    k: number,
    filter?: Parameters<PGVectorStore["similaritySearch"]>[2]
  ) {
    const store = await getVectorStore();
    return store.similaritySearch(query, k, filter);
  },

  // Expose the underlying store for advanced usage
  getStore(): Promise<PGVectorStore> {
    return getVectorStore();
  },
};
