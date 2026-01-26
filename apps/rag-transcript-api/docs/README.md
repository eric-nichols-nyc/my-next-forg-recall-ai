# RAG YouTube Documentation

This directory contains comprehensive documentation for the RAG YouTube application, focusing on transcript processing, embeddings, and vector search capabilities.

## Documentation Index

- [Transcript Processing](./transcript-processing.md) - Overview of how transcripts are processed, chunked, and embedded
- [Architecture](./architecture.md) - System architecture and design decisions
- [Embeddings & Vector Store](./embeddings.md) - Embedding generation and vector store setup
- [API Reference](./api-reference.md) - API endpoints and function documentation
- [Usage Guide](./usage-guide.md) - How to use the transcript processing system

## Quick Start

The transcript processing system allows you to:

1. **Import YouTube transcripts** - Fetch and process YouTube video transcripts
2. **Chunk transcripts** - Split transcripts into manageable chunks while preserving timestamps
3. **Generate embeddings** - Create vector embeddings for semantic search
4. **Store in database** - Save chunks and embeddings for RAG (Retrieval-Augmented Generation)
5. **Query transcripts** - Use the agent to ask questions about video content

## Key Components

- **`lib/transcript-processor.ts`** - Core processing logic for chunking and embedding
- **`ai/embeddings.ts`** - Embedding generation and vector store configuration
- **`ai/agent.ts`** - LangGraph agent for querying transcripts
- **`app/(protected)/transcript/actions.ts`** - Server actions for importing transcripts

## Getting Started

See [Usage Guide](./usage-guide.md) for step-by-step instructions on processing transcripts.

