import { z } from "zod";

// Zod schema for a single question
export const questionSchema = z.object({
  question: z.string().describe("The question text"),
  options: z.array(z.string()).length(4).describe("Four possible answers"),
  correctIndex: z
    .number()
    .min(0)
    .max(3)
    .describe("Index of the correct answer (0-3)"),
});

// Zod schema for the quiz (4 questions)
export const quizSchema = z.object({
  questions: z
    .array(questionSchema)
    .length(4)
    .describe("Four quiz questions based on the document content"),
});

// TypeScript types derived from the schemas
export type Question = z.infer<typeof questionSchema>;
export type QuizData = z.infer<typeof quizSchema>;
