-- Create ivfflat index for embeddings with > 2000 dimensions
-- HNSW index only supports up to 2000 dimensions
-- text-embedding-3-large uses 3072 dimensions, so we need ivfflat

-- First, ensure the embedding column has dimensions
ALTER TABLE "Chunk"
ALTER COLUMN embedding TYPE vector(3072)
USING embedding::vector(3072);

-- Create ivfflat index (supports up to 20000 dimensions)
-- Note: ivfflat requires a "lists" parameter (number of clusters)
-- For 4 chunks, we can use a small number like 1 or 2
-- For larger datasets, use lists = rows / 1000 (capped at 1000)
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx"
ON "Chunk" USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 1);

-- Verify the index was created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'Chunk'
AND indexname = 'Chunk_embedding_idx';

