# API Reference

Complete API reference for the transcript processing system.

## Transcript Processor

### `processTranscript`

Main function for processing transcript segments into chunks with embeddings.

```typescript
function processTranscript({
  segments,
  sourceId,
  ownerId,
  sourceType?,
  url?,
  maxChars?,
}: {
  segments: TranscriptSegment[];
  sourceId: string;
  ownerId: string;
  sourceType?: string;
  url?: string;
  maxChars?: number;
}): Promise<{
  chunkCount: number;
  chunkIds: string[];
}>
```

**Parameters**:
- `segments` (required): Array of transcript segments
- `sourceId` (required): UUID of the source
- `ownerId` (required): UUID of the owner/user
- `sourceType` (optional): Type of source, default: `"youtube"`
- `url` (optional): Source URL
- `maxChars` (optional): Maximum characters per chunk, default: `3500`

**Returns**:
- `chunkCount`: Number of chunks created
- `chunkIds`: Array of chunk UUIDs

**Example**:
```typescript
const result = await processTranscript({
  segments: transcriptSegments,
  sourceId: "abc-123",
  ownerId: "user-456",
  sourceType: "youtube",
  url: "https://youtube.com/watch?v=...",
  maxChars: 3500,
});
```

### `chunkSegments`

Groups transcript segments into chunks while preserving boundaries.

```typescript
function chunkSegments(
  segments: TranscriptSegment[],
  maxChars?: number
): Array<{
  chunkIndex: number;
  text: string;
  metadata: {
    ordinalStart: number;
    ordinalEnd: number;
    startSec: number | null;
    endSec: number | null;
  };
}>
```

**Parameters**:
- `segments`: Array of transcript segments
- `maxChars`: Maximum characters per chunk, default: `3500`

**Returns**: Array of chunk objects

**Example**:
```typescript
const chunks = chunkSegments(segments, 2000);
```

### `chunksToDocuments`

Converts chunks to LangChain Document objects.

```typescript
function chunksToDocuments(
  chunks: Array<{
    chunkIndex: number;
    text: string;
    metadata: Omit<ChunkMetadata, "sourceId" | "sourceType" | "url">;
  }>,
  metadata: Pick<ChunkMetadata, "sourceId" | "sourceType" | "url">
): Document[]
```

**Parameters**:
- `chunks`: Array of chunk objects
- `metadata`: Additional metadata to attach

**Returns**: Array of LangChain Document instances

### `processTranscriptWithLangChainSplitter`

Alternative processing using LangChain's RecursiveCharacterTextSplitter.

```typescript
function processTranscriptWithLangChainSplitter({
  transcriptText,
  sourceId,
  ownerId,
  sourceType?,
  url?,
  chunkSize?,
  chunkOverlap?,
}: {
  transcriptText: string;
  sourceId: string;
  ownerId: string;
  sourceType?: string;
  url?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}): Promise<{
  chunkCount: number;
  chunkIds: string[];
}>
```

**Note**: This may split across segment boundaries and lose timestamp precision.

## Types

### `TranscriptSegment`

```typescript
type TranscriptSegment = {
  ordinal: number;
  startSec: number | null;
  endSec: number | null;
  text: string;
};
```

### `ChunkMetadata`

```typescript
type ChunkMetadata = {
  ordinalStart: number;
  ordinalEnd: number;
  startSec: number | null;
  endSec: number | null;
  sourceId: string;
  sourceType?: string;
  url?: string;
};
```

## Embeddings API

### `embeddings`

OpenAI embeddings instance.

```typescript
import { embeddings } from "@/ai/embeddings";

// Embed a single query
const vector = await embeddings.embedQuery("text to embed");

// Embed multiple documents (batch)
const vectors = await embeddings.embedDocuments([
  "text 1",
  "text 2",
  "text 3",
]);
```

**Methods**:
- `embedQuery(text: string)`: Embed a single query string
- `embedDocuments(texts: string[])`: Embed multiple texts in batch

## Vector Store API

### `vectorStore`

PGVector store wrapper.

```typescript
import { vectorStore } from "@/ai/embeddings";
```

### `addDocuments`

Add documents to the vector store.

```typescript
await vectorStore.addDocuments(documents: Document[]): Promise<string[]>
```

**Parameters**:
- `documents`: Array of LangChain Document instances

**Returns**: Array of document IDs

**Example**:
```typescript
const documents = [
  new Document({
    pageContent: "Chunk text",
    metadata: { sourceId: "abc", chunkIndex: 0 },
  }),
];
await vectorStore.addDocuments(documents);
```

### `similaritySearch`

Search for similar documents.

```typescript
await vectorStore.similaritySearch(
  query: string,
  k: number,
  filter?: Record<string, unknown>
): Promise<Document[]>
```

**Parameters**:
- `query`: Search query text
- `k`: Number of results to return
- `filter`: Optional metadata filter

**Returns**: Array of matching documents

**Example**:
```typescript
const results = await vectorStore.similaritySearch(
  "Next.js performance",
  5,
  { sourceId: "abc-123" }
);
```

### `similaritySearchWithScore`

Search with similarity scores.

```typescript
await vectorStore.similaritySearchWithScore(
  query: string,
  k: number,
  filter?: Record<string, unknown>
): Promise<[Document, number][]>
```

**Returns**: Array of `[document, score]` tuples

**Example**:
```typescript
const results = await vectorStore.similaritySearchWithScore(
  "query",
  5
);

for (const [doc, score] of results) {
  console.log(`Score: ${score}, Content: ${doc.pageContent}`);
}
```

## Agent API

### `askAboutVideo`

Query a video transcript using the LangGraph agent.

```typescript
import { askAboutVideo } from "@/ai/agent";

const answer = await askAboutVideo(
  question: string,
  threadId?: string
): Promise<string>
```

**Parameters**:
- `question`: Question to ask about the video
- `threadId`: Optional thread ID for conversation history

**Returns**: Agent's answer as a string

**Example**:
```typescript
const answer = await askAboutVideo(
  "What are the main topics discussed?",
  "thread-123"
);
```

### `clearAgentMemory`

Clear conversation history for a thread.

```typescript
import { clearAgentMemory } from "@/ai/agent";

await clearAgentMemory(threadId: string): Promise<void>
```

### `getAgentMemory`

Get conversation history for a thread.

```typescript
import { getAgentMemory } from "@/ai/agent";

const memory = await getAgentMemory(threadId: string);
```

### `splitText`

Split text into chunks using LangChain's text splitter.

```typescript
import { splitText } from "@/ai/agent";

const chunks = await splitText("long text here", {
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

### `splitTextIntoDocuments`

Split text into LangChain Document objects.

```typescript
import { splitTextIntoDocuments } from "@/ai/agent";

const documents = await splitTextIntoDocuments(
  "long text here",
  { videoId: "abc-123" }
);
```

## Server Actions

### `importYoutube`

Import a YouTube transcript.

```typescript
import { importYoutube } from "@/app/(protected)/transcript/actions";

const result = await importYoutube({
  url: string,
}): Promise<{ noteId: string }>
```

**Parameters**:
- `url`: YouTube URL

**Returns**: Note ID

**Example**:
```typescript
const { noteId } = await importYoutube({
  url: "https://www.youtube.com/watch?v=VIDEO_ID",
});
```

## Database Schema

### Chunk Model

```prisma
model Chunk {
  id         String   @id @default(uuid())
  ownerId    String
  sourceId   String
  chunkIndex Int
  text       String?
  metadata   Json?
  embedding  Unsupported("vector")?

  @@unique([sourceId, chunkIndex])
  @@index([sourceId, chunkIndex])
}
```

### Source Model

```prisma
model Source {
  id        String   @id @default(uuid())
  ownerId   String
  type      SourceType
  url       String?
  title     String?
  texts     SourceText[]
  chunks    Chunk[]
  // ...
}
```

### SourceText Model

```prisma
model SourceText {
  id        String   @id @default(uuid())
  sourceId  String
  ownerId   String
  ordinal   Int
  text      String
  startSec  Int?
  endSec    Int?
  // ...
}
```

## Error Handling

### Common Errors

**`Error: OPENAI_API_KEY is required`**
- Solution: Set `OPENAI_API_KEY` environment variable

**`Error: DATABASE_URL is required`**
- Solution: Set `DATABASE_URL` environment variable

**`Error: pgvector extension not enabled`**
- Solution: Run `CREATE EXTENSION IF NOT EXISTS vector;`

**`Error: Unauthorized`**
- Solution: Ensure user is authenticated

## Type Definitions

All types are exported from `@/lib/transcript-processor`:

```typescript
import type {
  TranscriptSegment,
  ChunkMetadata,
} from "@/lib/transcript-processor";
```

## See Also

- [Usage Guide](./usage-guide.md) - Practical examples
- [Architecture](./architecture.md) - System design
- [Embeddings](./embeddings.md) - Embedding details

