-- Add embedding and metadata columns to Chunk table for PGVector support
-- Note: This migration requires the pgvector extension to be enabled first
-- Run: CREATE EXTENSION IF NOT EXISTS vector;

-- Add metadata column (jsonb) - required by PGVector
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add embedding column (vector) - required by PGVector
-- text-embedding-3-large produces 3072-dimensional vectors by default
-- Column is nullable to allow existing rows without embeddings
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "embedding" vector(3072);

-- Create an HNSW index on the embedding column for efficient similarity search
-- This index type is optimized for approximate nearest neighbor searches
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx" ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);

