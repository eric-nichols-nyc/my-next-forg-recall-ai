# Embeddings & Vector Store

This document explains how embeddings are generated and stored for semantic search.

## Overview

The system uses **OpenAI embeddings** and **PGVector** (PostgreSQL with pgvector extension) to enable semantic search over transcript chunks.

## Architecture

```
┌─────────────────────────────────────────┐
│      Transcript Chunks (Text)           │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    OpenAI Embeddings API                │
│    (text-embedding-3-large)             │
│    - 3072 dimensions                     │
│    - Batch processing                    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│      Vector Embeddings                  │
│      [0.123, -0.456, 0.789, ...]        │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│      PostgreSQL + pgvector               │
│      - HNSW index for fast search        │
│      - Cosine similarity                 │
│      - Persistent storage                │
└─────────────────────────────────────────┘
```

## Embedding Model

### Configuration

- **Model**: `text-embedding-3-large`
- **Dimensions**: 3072 (default)
- **Provider**: OpenAI
- **Cost**: ~$0.0001 per 1K tokens

### Why This Model?

- ✅ **High quality**: Large model provides better semantic understanding
- ✅ **Good performance**: Fast enough for batch processing
- ✅ **Proven**: Widely used in production RAG systems

## Vector Store Setup

### Database Configuration

The vector store uses the existing `Chunk` table:

```typescript
PGVectorStore.initialize(embeddings, {
  postgresConnectionOptions: {
    connectionString: databaseUrl,
  },
  tableName: "Chunk",
  contentColumnName: "text", // Our table uses "text" instead of "content"
});
```

### Required Columns

The `Chunk` table must have:

- `id` (uuid, primary key)
- `text` (text) - The chunk content
- `metadata` (jsonb) - Additional metadata
- `embedding` (vector) - The embedding vector

### Database Extension

Enable the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Or via Neon Console:
1. Go to Neon Console → Your Database → Extensions
2. Enable the "vector" extension

### Index

An HNSW index is created for efficient similarity search:

```sql
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx"
ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);
```

## Embedding Generation

### Batch Processing

Embeddings are generated in batches for efficiency:

```typescript
// Get all chunk texts
const textsToEmbed = chunks
  .map(chunk => chunk.text)
  .filter(text => text !== null);

// Generate all embeddings in one call
const embeddingVectors = await embeddings.embedDocuments(textsToEmbed);
```

### Storage

Embeddings are stored using raw SQL (Prisma doesn't support vector type):

```typescript
const vectorString = `[${embedding.join(",")}]`;
await database.$executeRawUnsafe(
  `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
  vectorString,
  chunkId
);
```

## Vector Store API

### Adding Documents

```typescript
import { vectorStore } from "@/ai/embeddings";
import { Document } from "@langchain/core/documents";

const documents = [
  new Document({
    pageContent: "Chunk text here",
    metadata: { sourceId: "...", chunkIndex: 0 },
  }),
];

await vectorStore.addDocuments(documents);
```

### Similarity Search

```typescript
// Search with scores
const results = await vectorStore.similaritySearchWithScore(
  "query text",
  5, // top k results
  { sourceId: "specific-source-id" } // optional filter
);

// results: [[Document, score], ...]
```

### Filtering

You can filter by metadata:

```typescript
const results = await vectorStore.similaritySearch(
  "query",
  5,
  {
    sourceId: "abc-123",
    sourceType: "youtube",
  }
);
```

## How Embeddings Work

### Semantic Understanding

Embeddings convert text into high-dimensional vectors that capture meaning:

```
Text: "How does React work?"
Embedding: [0.123, -0.456, 0.789, ..., 0.234] (3072 numbers)

Text: "What is React?"
Embedding: [0.125, -0.451, 0.791, ..., 0.238] (similar numbers)

Text: "What's for dinner?"
Embedding: [-0.234, 0.567, -0.123, ..., -0.456] (different numbers)
```

### Similarity Calculation

The vector store uses **cosine similarity** to find related chunks:

```
similarity = cosine(embedding1, embedding2)
// Range: -1 (opposite) to 1 (identical)
// Higher = more similar
```

### Search Process

1. **Query embedding**: Convert search query to vector
2. **Similarity search**: Find chunks with similar vectors
3. **Ranking**: Sort by similarity score
4. **Filtering**: Apply metadata filters (optional)
5. **Return**: Top k results

## Usage Examples

### Search Transcripts

```typescript
import { vectorStore } from "@/ai/embeddings";

// Find chunks about a specific topic
const results = await vectorStore.similaritySearchWithScore(
  "Next.js performance optimization",
  5,
  { sourceId: "youtube-video-id" }
);

for (const [doc, score] of results) {
  console.log(`Score: ${score.toFixed(4)}`);
  console.log(`Content: ${doc.pageContent}`);
  console.log(`Metadata:`, doc.metadata);
}
```

### Using the Agent

The agent uses the vector store automatically:

```typescript
import { askAboutVideo } from "@/ai/agent";

const answer = await askAboutVideo(
  "What are the main topics discussed?",
  "thread-id" // optional, for conversation history
);
```

## Performance

### Index Performance

- **HNSW Index**: Approximate nearest neighbor search
- **Speed**: Sub-millisecond queries for thousands of chunks
- **Accuracy**: High recall with HNSW algorithm

### Query Optimization

1. **Limit results**: Use small `k` values (5-10) for faster queries
2. **Filter early**: Apply metadata filters to reduce search space
3. **Batch queries**: Process multiple queries together when possible

## Troubleshooting

### Embeddings Not Stored

**Problem**: `embedding` column is NULL

**Solutions**:
1. Check OpenAI API key is set: `OPENAI_API_KEY`
2. Verify embeddings are generated: Check logs for "Generated X embeddings"
3. Check database connection: Verify `DATABASE_URL`
4. Check pgvector extension: Run `CREATE EXTENSION IF NOT EXISTS vector;`

### Slow Queries

**Problem**: Similarity search is slow

**Solutions**:
1. Verify HNSW index exists: `\d+ "Chunk"` in psql
2. Reduce `k` value (fewer results)
3. Add metadata filters to narrow search
4. Check database performance

### Empty Results

**Problem**: No results from similarity search

**Solutions**:
1. Verify embeddings exist: `SELECT COUNT(*) FROM "Chunk" WHERE embedding IS NOT NULL;`
2. Check filter metadata matches
3. Try broader queries
4. Verify sourceId is correct

## Environment Variables

Required:

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

## Next Steps

- See [Usage Guide](./usage-guide.md) for practical examples
- See [API Reference](./api-reference.md) for detailed API docs
- See [Architecture](./architecture.md) for system design

