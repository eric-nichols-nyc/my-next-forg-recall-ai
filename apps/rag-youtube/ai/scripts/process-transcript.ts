/**
 * Script to process video1 transcript and log all chunks as Documents
 * Run with: pnpm exec tsx ai/scripts/process-transcript.ts
 * (from the rag-youtube directory)
 */

import { processVideo1Transcript } from "../agent.js";

// Execute the processing
processVideo1Transcript()
  .then(() => {
    console.log("✅ Transcript processing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error processing transcript:", error);
    process.exit(1);
  });

