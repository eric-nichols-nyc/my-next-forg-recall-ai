-- Check which table has data
SELECT 'Chunk (capital)' as table_name, COUNT(*) as row_count FROM "Chunk"
UNION ALL
SELECT 'chunk (lowercase)' as table_name, COUNT(*) as row_count FROM chunk;

-- Check table structures
SELECT
    'Chunk (capital)' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Chunk'
ORDER BY ordinal_position;

SELECT
    'chunk (lowercase)' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chunk'
ORDER BY ordinal_position;

