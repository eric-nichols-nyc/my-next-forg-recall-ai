import { openai } from '@ai-sdk/openai';

/**
 * This file defines which AI model we'll use.
 * 
 * Think of this as your "AI provider configuration".
 * We're using OpenAI's GPT-4o-mini model because it's:
 * - Fast
 * - Cheap
 * - Good for learning
 * 
 * Later you can swap this for other models (Claude, Gemini, etc.)
 */

export const model = openai('gpt-4o-mini');

/**
 * Model explanation:
 * - 'gpt-4o-mini' is the model ID
 * - openai() creates a model instance from the @ai-sdk/openai package
 * - This model supports streaming (sends responses token-by-token)
 */
