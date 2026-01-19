-- Create HNSW index on Chunk table for PGVector similarity search
-- This index is REQUIRED for vector similarity search to work

-- Ensure the pgvector extension is enabled first
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the HNSW index on the embedding column
-- This index is optimized for approximate nearest neighbor searches
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx"
ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);

-- Verify the index was created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'Chunk'
AND indexdef LIKE '%hnsw%';

