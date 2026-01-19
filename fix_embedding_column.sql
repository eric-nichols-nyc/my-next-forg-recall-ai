-- Fix embedding column to have proper dimensions
-- text-embedding-3-large uses 3072 dimensions

-- 1. First, check the current column type
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Chunk'
AND column_name = 'embedding';

-- 2. Check if there are any embeddings stored
SELECT COUNT(*) as chunks_with_embeddings
FROM "Chunk"
WHERE embedding IS NOT NULL;

-- 3. If the column exists but doesn't have dimensions, we need to alter it
-- WARNING: This will only work if the column is already vector type but without dimensions
-- If you have data, you might need to backup first

-- Option A: If the column is vector type but missing dimensions (most likely)
-- This should work if embeddings are already stored
ALTER TABLE "Chunk"
ALTER COLUMN embedding TYPE vector(3072)
USING embedding::vector(3072);

-- Option B: If the above fails and the column is a different type, we'd need to:
-- 1. Add a new column
-- 2. Copy data
-- 3. Drop old column
-- 4. Rename new column
-- But let's try Option A first

-- 4. After fixing the column, create the HNSW index
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx"
ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);

-- 5. Verify the fix
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Chunk'
AND column_name = 'embedding';

