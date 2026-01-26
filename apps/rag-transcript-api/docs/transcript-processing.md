# Transcript Processing

This document explains how YouTube transcripts are processed, chunked, and embedded for RAG (Retrieval-Augmented Generation).

## Overview

The transcript processing system takes raw YouTube transcript segments and:

1. **Chunks** them into manageable pieces (preserving segment boundaries)
2. **Generates embeddings** using OpenAI's text-embedding-3-large model
3. **Stores** chunks and embeddings in the database
4. **Enables semantic search** via the vector store

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Action                            │
│         (Submit YouTube URL)                              │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              actions.ts (Server Action)                  │
│  - Fetches transcript from YouTube                       │
│  - Saves segments to SourceText table                    │
│  - Generates summary                                     │
│  - Calls processTranscript()                            │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         transcript-processor.ts                          │
│                                                           │
│  1. chunkSegments()                                      │
│     - Groups segments into chunks                        │
│     - Preserves timestamps                               │
│     - Never splits a segment                             │
│                                                           │
│  2. Create chunks in database                             │
│     - Store chunk text and metadata                      │
│                                                           │
│  3. Generate embeddings                                  │
│     - Batch embed all chunks                             │
│     - Uses OpenAI text-embedding-3-large                 │
│                                                           │
│  4. Update chunks with embeddings                        │
│     - Store vectors in embedding column                 │
│                                                           │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Database (Chunk table)                      │
│  - id (uuid)                                             │
│  - text (chunk content)                                  │
│  - metadata (jsonb with timestamps)                       │
│  - embedding (vector) ← Embeddings stored here           │
└─────────────────────────────────────────────────────────┘
```

## Chunking Strategy

### Segment-Based Chunking

The system uses **segment-based chunking** which:

- ✅ **Preserves segment boundaries** - Never splits a transcript segment
- ✅ **Maintains timestamps** - Each chunk knows its time range
- ✅ **Respects natural breaks** - Chunks are created at segment boundaries
- ✅ **Configurable size** - Default max 3500 characters per chunk

### How It Works

```typescript
// Input: Array of transcript segments
[
  { ordinal: 0, startSec: 0, endSec: 5, text: "Hello world" },
  { ordinal: 1, startSec: 5, endSec: 10, text: "This is a test" },
  // ... more segments
]

// Output: Chunks with preserved boundaries
[
  {
    chunkIndex: 0,
    text: "- [0:00] Hello world\n- [0:05] This is a test\n...",
    metadata: {
      ordinalStart: 0,
      ordinalEnd: 10,
      startSec: 0,
      endSec: 30
    }
  }
]
```

### Chunk Format

Each chunk includes:

- **Text**: Formatted with timestamps like `- [0:05] Transcript text`
- **Metadata**:
  - `ordinalStart` / `ordinalEnd`: Range of segment ordinals
  - `startSec` / `endSec`: Time range in seconds
  - `sourceId`: Reference to the source
  - `sourceType`: Type of source (e.g., "youtube")
  - `url`: Source URL

## Embedding Generation

### Process

1. **Batch Processing**: All chunks are embedded in a single batch call (more efficient)
2. **Model**: Uses OpenAI's `text-embedding-3-large` (3072 dimensions)
3. **Storage**: Embeddings stored directly in the `embedding` column (vector type)

### Implementation

```typescript
// Generate embeddings for all chunks
const textsToEmbed = chunks.map(chunk => chunk.text);
const embeddingVectors = await embeddings.embedDocuments(textsToEmbed);

// Update each chunk with its embedding
for (let i = 0; i < chunks.length; i++) {
  const embedding = embeddingVectors[i];
  // Store in database using raw SQL (Prisma doesn't support vector type)
  await database.$executeRawUnsafe(
    `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
    `[${embedding.join(",")}]`,
    chunkId
  );
}
```

## Database Schema

### Chunk Table

```prisma
model Chunk {
  id         String   @id @default(uuid())
  ownerId    String
  sourceId   String
  chunkIndex Int
  text       String?
  metadata   Json?
  embedding  Unsupported("vector")?  // pgvector type

  @@unique([sourceId, chunkIndex])
  @@index([sourceId, chunkIndex])
}
```

### Required Extensions

The database must have the `pgvector` extension enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Usage

### Basic Usage

```typescript
import { processTranscript } from "@/lib/transcript-processor";

const result = await processTranscript({
  segments: transcriptSegments,
  sourceId: "source-uuid",
  ownerId: "user-uuid",
  sourceType: "youtube",
  url: "https://youtube.com/watch?v=...",
  maxChars: 3500, // Optional, default: 3500
});

console.log(`Created ${result.chunkCount} chunks`);
```

### From Server Action

The `importYoutube` action in `actions.ts` handles the full flow:

```typescript
// 1. Fetch transcript
const raw = await YoutubeTranscript.fetchTranscript(url);

// 2. Convert to segments
const segments = raw.map((t, i) => ({
  ordinal: i,
  startSec: Math.floor((t.offset ?? 0) / 1000),
  endSec: startSec + Math.ceil((t.duration ?? 0) / 1000),
  text: String(t.text ?? "").trim(),
}));

// 3. Process (chunk + embed)
await processTranscript({
  segments,
  sourceId: source.id,
  ownerId: source.ownerId,
  sourceType: "youtube",
  url,
});
```

## Alternative: LangChain Splitter

For cases where you don't need to preserve segment boundaries, you can use LangChain's `RecursiveCharacterTextSplitter`:

```typescript
import { processTranscriptWithLangChainSplitter } from "@/lib/transcript-processor";

await processTranscriptWithLangChainSplitter({
  transcriptText: fullTranscriptText,
  sourceId: "source-uuid",
  ownerId: "user-uuid",
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

**Note**: This approach may split across segment boundaries and lose timestamp precision.

## Performance Considerations

### Batch Embedding

- **Efficient**: All embeddings generated in one API call
- **Rate Limits**: Be aware of OpenAI rate limits for large transcripts
- **Cost**: Each chunk costs ~$0.0001 (text-embedding-3-large pricing)

### Chunk Size

- **Smaller chunks** (1000-2000 chars): More precise search, more chunks
- **Larger chunks** (3500-5000 chars): Fewer chunks, less precise search
- **Default**: 3500 characters balances precision and cost

## Error Handling

The system handles:

- **Empty transcripts**: Returns early with warning
- **Missing text**: Skips chunks without text content
- **Embedding failures**: Logs errors but continues processing
- **Database errors**: Throws errors for debugging

## Next Steps

After processing, chunks are ready for:

- **Semantic search** via the vector store
- **RAG queries** using the agent (`askAboutVideo`)
- **Similarity search** for finding related content

See [Usage Guide](./usage-guide.md) for examples.

