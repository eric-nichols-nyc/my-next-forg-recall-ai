-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('pdf', 'web', 'youtube');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "filename" TEXT,
    "sha256" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceText" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "startSec" INTEGER,
    "endSec" INTEGER,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "model" TEXT,
    "summaryMd" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "sourceTextId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "quizId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "sourceTextId" UUID,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "threadId" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "sourceTextId" UUID,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "startChar" INTEGER,
    "endChar" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_ownerId_idx" ON "Source"("ownerId");

-- CreateIndex
CREATE INDEX "Source_type_idx" ON "Source"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Source_sha256_key" ON "Source"("sha256");

-- CreateIndex
CREATE INDEX "SourceText_sourceId_idx" ON "SourceText"("sourceId");

-- CreateIndex
CREATE INDEX "SourceText_ownerId_idx" ON "SourceText"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceText_sourceId_ordinal_key" ON "SourceText"("sourceId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "Note_sourceId_key" ON "Note"("sourceId");

-- CreateIndex
CREATE INDEX "Note_ownerId_idx" ON "Note"("ownerId");

-- CreateIndex
CREATE INDEX "Flashcard_sourceId_idx" ON "Flashcard"("sourceId");

-- CreateIndex
CREATE INDEX "Flashcard_sourceTextId_idx" ON "Flashcard"("sourceTextId");

-- CreateIndex
CREATE INDEX "Flashcard_ownerId_idx" ON "Flashcard"("ownerId");

-- CreateIndex
CREATE INDEX "Quiz_sourceId_idx" ON "Quiz"("sourceId");

-- CreateIndex
CREATE INDEX "Quiz_ownerId_idx" ON "Quiz"("ownerId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizQuestion_sourceTextId_idx" ON "QuizQuestion"("sourceTextId");

-- CreateIndex
CREATE INDEX "QuizQuestion_ownerId_idx" ON "QuizQuestion"("ownerId");

-- CreateIndex
CREATE INDEX "ChatThread_sourceId_idx" ON "ChatThread"("sourceId");

-- CreateIndex
CREATE INDEX "ChatThread_ownerId_idx" ON "ChatThread"("ownerId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_ownerId_idx" ON "ChatMessage"("ownerId");

-- CreateIndex
CREATE INDEX "Chunk_sourceId_idx" ON "Chunk"("sourceId");

-- CreateIndex
CREATE INDEX "Chunk_sourceTextId_idx" ON "Chunk"("sourceTextId");

-- CreateIndex
CREATE INDEX "Chunk_ownerId_idx" ON "Chunk"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_sourceId_chunkIndex_key" ON "Chunk"("sourceId", "chunkIndex");
