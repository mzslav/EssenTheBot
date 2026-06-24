import { createEmbedding } from '../adapters/openrouter';

export async function createTextEmbedding(text: string, referer?: string): Promise<number[]> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error('Cannot create embedding for empty text.');
  }

  return createEmbedding(normalizedText, referer);
}
