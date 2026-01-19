-- Fix Chunk table and index issues
-- Run this to ensure the HNSW index is on the correct "Chunk" table

-- 1. First, check current state
SELECT
  'Chunk' as table_name,
  COUNT(*) as total_rows,
  COUNT(embedding) as rows_with_embeddings
FROM "Chunk"
UNION ALL
SELECT
  'chunk' as table_name,
  COUNT(*) as total_rows,
  COUNT(embedding) as rows_with_embeddings
FROM chunk;

-- 2. Check which table has the HNSW index
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename = 'Chunk' OR tablename = 'chunk')
AND indexdef LIKE '%hnsw%';

-- 3. If the lowercase chunk table is empty and has an index, drop the index first
-- (Uncomment if needed)
-- DROP INDEX IF EXISTS "chunk_embedding_idx";

-- 4. Ensure the HNSW index exists on the correct "Chunk" table
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx"
ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);

-- 5. If the lowercase chunk table is completely empty, drop it
-- (Uncomment only after verifying chunk table is empty and not needed)
-- DROP TABLE IF EXISTS chunk;

-- 6. Verify the fix
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'Chunk'
AND indexdef LIKE '%hnsw%';

