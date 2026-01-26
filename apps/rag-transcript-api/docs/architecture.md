# Architecture

System architecture and design decisions for the RAG YouTube application.

## Overview

The RAG YouTube application processes YouTube transcripts, generates embeddings, and enables semantic search through a LangGraph agent. The architecture emphasizes:

- **Separation of concerns**: Processing logic separated from actions
- **Reusability**: Core utilities can be used across the application
- **Scalability**: Batch processing and efficient vector storage
- **Maintainability**: Clear boundaries and well-defined interfaces

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  - YouTube URL input form                                    │
│  - Query interface                                           │
│  - Results display                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Actions Layer                      │
│  app/(protected)/transcript/actions.ts                      │
│  - Authentication                                            │
│  - Input validation                                           │
│  - Orchestration                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Processing Layer                            │
│  lib/transcript-processor.ts                                 │
│  - Chunking logic                                            │
│  - Embedding generation                                      │
│  - Database operations                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Embeddings API  │    │  Vector Store    │
│  ai/embeddings.ts│    │  (PGVector)      │
│  - OpenAI API    │    │  - Similarity    │
│  - Batch embed   │    │  - Indexing      │
└──────────────────┘    └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  PostgreSQL + pgvector                                       │
│  - Chunk table (with embeddings)                            │
│  - SourceText table                                          │
│  - Source table                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Query Layer                                │
│  ai/agent.ts                                                 │
│  - LangGraph agent                                           │
│  - Vector search                                             │
│  - Conversation memory                                       │
└─────────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. Separate Processing Utility

**Decision**: Extract processing logic into `lib/transcript-processor.ts` instead of keeping it in `actions.ts`.

**Rationale**:
- ✅ **Reusability**: Can be used from API routes, background jobs, etc.
- ✅ **Testability**: Easier to unit test in isolation
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Flexibility**: Can be used with different input sources

**Alternative Considered**: Keep everything in `actions.ts`
- ❌ Less reusable
- ❌ Harder to test
- ❌ Tightly coupled to server actions

### 2. Segment-Based Chunking

**Decision**: Preserve segment boundaries when chunking, never split a segment.

**Rationale**:
- ✅ **Timestamp preservation**: Maintains accurate time references
- ✅ **Context integrity**: Segments are natural units of meaning
- ✅ **User experience**: Users can jump to specific timestamps

**Alternative Considered**: Use LangChain's RecursiveCharacterTextSplitter
- ❌ Loses timestamp precision
- ❌ May split mid-sentence
- ✅ More flexible chunk sizes

**Compromise**: Provide both options (`processTranscript` and `processTranscriptWithLangChainSplitter`)

### 3. Batch Embedding Generation

**Decision**: Generate all embeddings in a single batch call.

**Rationale**:
- ✅ **Efficiency**: One API call instead of N calls
- ✅ **Rate limits**: Better utilization of rate limits
- ✅ **Cost**: Slightly cheaper (batch pricing)
- ✅ **Speed**: Parallel processing on OpenAI side

**Alternative Considered**: Generate embeddings one-by-one
- ❌ Slower
- ❌ More API calls
- ❌ Higher risk of rate limiting

### 4. Direct Database Storage

**Decision**: Store embeddings directly in the database using raw SQL.

**Rationale**:
- ✅ **Persistence**: Embeddings survive application restarts
- ✅ **Consistency**: Single source of truth
- ✅ **Performance**: No need to regenerate embeddings
- ✅ **Simplicity**: One database, one schema

**Alternative Considered**: Separate vector database (Pinecone, Weaviate)
- ❌ Additional infrastructure
- ❌ Data synchronization complexity
- ❌ Higher cost
- ✅ Better scalability (for very large datasets)

### 5. PGVector Integration

**Decision**: Use PGVector (PostgreSQL + pgvector extension) for vector storage.

**Rationale**:
- ✅ **Familiar**: Same database as rest of application
- ✅ **ACID compliance**: Transactions and consistency
- ✅ **Cost-effective**: No additional service
- ✅ **HNSW indexing**: Fast approximate nearest neighbor search

**Trade-offs**:
- ⚠️ Database size: Vectors are large (3072 dimensions × 4 bytes = ~12KB per chunk)
- ⚠️ Query performance: Good but not as fast as specialized vector DBs

### 6. LangGraph Agent

**Decision**: Use LangGraph's createReactAgent for querying transcripts.

**Rationale**:
- ✅ **Stateful**: Maintains conversation history
- ✅ **Tool use**: Can search vector store
- ✅ **Flexible**: Can extend with more tools
- ✅ **Production-ready**: Well-tested framework

**Alternative Considered**: Direct vector search + LLM
- ❌ No conversation memory
- ❌ More manual orchestration
- ✅ Simpler architecture

## Data Flow

### Import Flow

```
1. User submits YouTube URL
   ↓
2. actions.ts: importYoutube()
   - Validates input
   - Fetches transcript
   - Saves to SourceText
   - Generates summary
   ↓
3. processTranscript()
   - Chunks segments
   - Creates chunks in DB
   - Generates embeddings
   - Updates chunks with embeddings
   ↓
4. Database: Chunks stored with embeddings
   ↓
5. Return noteId to user
```

### Query Flow

```
1. User asks question
   ↓
2. askAboutVideo()
   - Converts question to embedding
   ↓
3. Vector store search
   - Finds similar chunks
   - Filters by sourceId
   ↓
4. Agent processes
   - Receives relevant chunks
   - Generates answer
   - Maintains conversation history
   ↓
5. Return answer to user
```

## Component Responsibilities

### `actions.ts`
- **Responsibility**: Server action orchestration
- **Does**: Authentication, validation, coordination
- **Doesn't**: Chunking logic, embedding generation

### `transcript-processor.ts`
- **Responsibility**: Core processing logic
- **Does**: Chunking, embedding, database operations
- **Doesn't**: Authentication, user interaction

### `embeddings.ts`
- **Responsibility**: Embedding generation and vector store
- **Does**: OpenAI API calls, PGVector setup
- **Doesn't**: Business logic, chunking

### `agent.ts`
- **Responsibility**: Query processing and conversation
- **Does**: Vector search, LLM interaction, memory
- **Doesn't**: Transcript processing, embedding generation

## Scalability Considerations

### Current Limitations

1. **Embedding Generation**: Sequential processing (could be parallelized)
2. **Database Size**: Large vectors increase database size
3. **Query Performance**: HNSW index helps but has limits

### Future Improvements

1. **Background Jobs**: Process transcripts asynchronously
2. **Caching**: Cache embeddings for repeated queries
3. **Sharding**: Partition chunks by source or date
4. **CDN**: Serve frequently accessed chunks from CDN

## Security

### Authentication
- All server actions require authentication
- User ownership verified before processing
- Database row-level security (RLS) via Prisma

### Data Privacy
- Embeddings stored per-user (ownerId)
- No cross-user data access
- API keys stored in environment variables

### Input Validation
- Zod schemas for all inputs
- URL validation
- Sanitization of user-provided text

## Testing Strategy

### Unit Tests
- `chunkSegments()`: Test chunking logic
- `chunksToDocuments()`: Test document conversion
- Embedding generation: Mock OpenAI API

### Integration Tests
- Full processing pipeline
- Database operations
- Vector store queries

### E2E Tests
- User import flow
- Query flow
- Error handling

## Monitoring

### Key Metrics
- Processing time per transcript
- Embedding generation time
- Query latency
- Error rates

### Logging
- Processing steps logged with emojis for visibility
- Errors logged with context
- Performance metrics tracked

## Dependencies

### Core
- `@langchain/core`: Document types
- `@langchain/openai`: Embeddings
- `@langchain/community`: PGVector store
- `@langchain/langgraph`: Agent framework

### Database
- `@repo/prisma-neon`: Prisma client
- `pg`: PostgreSQL driver
- `pgvector`: Vector extension

### AI
- `openai`: Embedding API
- `@anthropic-ai/sdk`: Agent LLM

## Future Enhancements

1. **Multi-modal**: Support images, audio
2. **Streaming**: Stream processing for long videos
3. **Incremental Updates**: Update embeddings when transcript changes
4. **Hybrid Search**: Combine semantic + keyword search
5. **Fine-tuning**: Custom embedding models

## See Also

- [Transcript Processing](./transcript-processing.md) - Processing details
- [Embeddings](./embeddings.md) - Embedding architecture
- [Usage Guide](./usage-guide.md) - How to use
- [API Reference](./api-reference.md) - API docs

