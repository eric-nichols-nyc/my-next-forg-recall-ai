# Usage Guide

Step-by-step guide for using the transcript processing system.

## Prerequisites

1. **Database Setup**
   - Neon PostgreSQL database
   - pgvector extension enabled
   - Chunk table with embedding column

2. **Environment Variables**
   ```env
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...  # For agent queries
   ```

3. **Dependencies**
   - All packages installed: `pnpm install`

## Basic Usage

### 1. Import a YouTube Transcript

```typescript
import { importYoutube } from "@/app/(protected)/transcript/actions";

const result = await importYoutube({
  url: "https://www.youtube.com/watch?v=VIDEO_ID",
});

console.log(`Note ID: ${result.noteId}`);
```

This will:
- Fetch the transcript
- Save segments to `SourceText` table
- Generate a summary
- Process chunks and embeddings
- Return the note ID

### 2. Process Transcript Segments

If you already have transcript segments:

```typescript
import { processTranscript } from "@/lib/transcript-processor";

const segments = [
  { ordinal: 0, startSec: 0, endSec: 5, text: "Hello world" },
  { ordinal: 1, startSec: 5, endSec: 10, text: "This is a test" },
  // ... more segments
];

const result = await processTranscript({
  segments,
  sourceId: "source-uuid",
  ownerId: "user-uuid",
  sourceType: "youtube",
  url: "https://youtube.com/watch?v=...",
});

console.log(`Created ${result.chunkCount} chunks`);
console.log(`Chunk IDs:`, result.chunkIds);
```

### 3. Query Transcripts

#### Using the Agent

```typescript
import { askAboutVideo } from "@/ai/agent";

// Ask a question
const answer = await askAboutVideo(
  "What are the main topics discussed in this video?",
  "thread-123" // optional: for conversation history
);

console.log(answer);
```

#### Direct Vector Search

```typescript
import { vectorStore } from "@/ai/embeddings";

const results = await vectorStore.similaritySearchWithScore(
  "Next.js performance",
  5, // top 5 results
  { sourceId: "source-uuid" } // filter by source
);

for (const [doc, score] of results) {
  console.log(`Score: ${score.toFixed(4)}`);
  console.log(`Content: ${doc.pageContent}`);
  console.log(`Time: ${doc.metadata.startSec}s - ${doc.metadata.endSec}s`);
}
```

## Frontend Integration

### Import Form

```tsx
"use client";

import { importYoutube } from "@/app/(protected)/transcript/actions";
import { useActionState } from "react";

export function YouTubeImportForm() {
  const [state, formAction, isPending] = useActionState(importYoutube, null);

  return (
    <form action={formAction}>
      <input
        name="url"
        type="url"
        placeholder="YouTube URL"
        required
        disabled={isPending}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Processing..." : "Import Transcript"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.noteId && (
        <p>Success! Note ID: {state.noteId}</p>
      )}
    </form>
  );
}
```

### Query Interface

```tsx
"use client";

import { askAboutVideo } from "@/ai/agent";
import { useState } from "react";

export function TranscriptQuery({ sourceId }: { sourceId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await askAboutVideo(question);
      setAnswer(result);
    } catch (error) {
      console.error(error);
      setAnswer("Error: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the transcript..."
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>
      {answer && <div>{answer}</div>}
    </div>
  );
}
```

## Advanced Usage

### Custom Chunking

```typescript
import { chunkSegments, chunksToDocuments } from "@/lib/transcript-processor";

// Custom chunk size
const chunks = chunkSegments(segments, 2000); // 2000 chars max

// Convert to LangChain documents
const documents = chunksToDocuments(chunks, {
  sourceId: "source-uuid",
  sourceType: "youtube",
  url: "https://...",
});
```

### Batch Processing Multiple Videos

```typescript
async function processMultipleVideos(urls: string[]) {
  const results = await Promise.all(
    urls.map(url => importYoutube({ url }))
  );

  return results;
}
```

### Filtered Search

```typescript
// Search only specific sources
const results = await vectorStore.similaritySearch(
  "query",
  10,
  {
    sourceId: { $in: ["id1", "id2", "id3"] },
    sourceType: "youtube",
  }
);
```

### Conversation History

```typescript
// Maintain conversation context
const threadId = "user-123-video-456";

// First question
const answer1 = await askAboutVideo(
  "What is this video about?",
  threadId
);

// Follow-up (agent remembers context)
const answer2 = await askAboutVideo(
  "Can you explain the first point in more detail?",
  threadId
);
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
  const result = await processTranscript({
    segments,
    sourceId,
    ownerId,
  });
} catch (error) {
  if (error instanceof Error) {
    console.error("Processing failed:", error.message);
  }
  // Handle error
}
```

### Validation

```typescript
import { z } from "zod";

const SegmentSchema = z.object({
  ordinal: z.number(),
  startSec: z.number().nullable(),
  endSec: z.number().nullable(),
  text: z.string(),
});

// Validate before processing
const validSegments = segments.map(s => SegmentSchema.parse(s));
```

## Performance Tips

### 1. Batch Embeddings

Always use batch embedding when possible:

```typescript
// ✅ Good: Batch
const embeddings = await embeddings.embedDocuments(texts);

// ❌ Bad: One by one
for (const text of texts) {
  await embeddings.embedQuery(text);
}
```

### 2. Optimize Chunk Size

- **Small chunks** (1000-2000): Better precision, more chunks
- **Large chunks** (3500-5000): Fewer chunks, less precision
- **Default** (3500): Good balance

### 3. Limit Search Results

```typescript
// ✅ Good: Small k
await vectorStore.similaritySearch(query, 5);

// ❌ Bad: Large k
await vectorStore.similaritySearch(query, 100);
```

### 4. Use Filters

```typescript
// ✅ Good: Filtered
await vectorStore.similaritySearch(query, 5, { sourceId });

// ❌ Bad: No filter
await vectorStore.similaritySearch(query, 5);
```

## Common Patterns

### Pattern 1: Process and Query

```typescript
// 1. Import transcript
const { noteId } = await importYoutube({ url });

// 2. Get source ID
const note = await database.note.findUnique({
  where: { id: noteId },
  include: { source: true },
});

// 3. Query
const answer = await askAboutVideo(
  "Summarize the main points",
  `thread-${note.source.id}`
);
```

### Pattern 2: Search and Display

```typescript
// 1. Search
const results = await vectorStore.similaritySearchWithScore(
  query,
  5,
  { sourceId }
);

// 2. Display with timestamps
results.forEach(([doc, score]) => {
  const startTime = doc.metadata.startSec;
  const endTime = doc.metadata.endSec;
  console.log(`[${startTime}s - ${endTime}s] ${doc.pageContent}`);
});
```

### Pattern 3: Multi-Source Search

```typescript
// Search across multiple videos
const allResults = await Promise.all(
  sourceIds.map(sourceId =>
    vectorStore.similaritySearch(query, 5, { sourceId })
  )
);

// Combine and rank
const combined = allResults.flat().sort((a, b) => b.score - a.score);
```

## Troubleshooting

### Issue: Embeddings Not Generated

**Check**:
1. `OPENAI_API_KEY` is set
2. API key is valid
3. Check logs for errors

**Solution**:
```typescript
// Test embedding generation
const testEmbedding = await embeddings.embedQuery("test");
console.log("Embedding dimensions:", testEmbedding.length);
```

### Issue: No Search Results

**Check**:
1. Embeddings exist: `SELECT COUNT(*) FROM "Chunk" WHERE embedding IS NOT NULL;`
2. Filter metadata matches
3. Query is not too specific

**Solution**:
```typescript
// Verify chunks exist
const chunks = await database.chunk.findMany({
  where: { sourceId, embedding: { not: null } },
});
console.log(`Found ${chunks.length} chunks with embeddings`);
```

### Issue: Slow Processing

**Check**:
1. Number of chunks
2. API rate limits
3. Database performance

**Solution**:
- Process in smaller batches
- Add delays between batches
- Optimize chunk size

## Next Steps

- See [API Reference](./api-reference.md) for detailed function docs
- See [Architecture](./architecture.md) for system design
- See [Embeddings](./embeddings.md) for embedding details

