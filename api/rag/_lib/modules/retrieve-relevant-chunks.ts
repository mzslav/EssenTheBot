import { matchKnowledgeChunks } from '../adapters/knowledge-store';
import { ragEnv } from '../env';
import { createTextEmbedding } from './create-text-embedding';

type RetrieveRelevantChunksInput = {
  userId: number;
  query: string;
  matchCount?: number;
  matchThreshold?: number;
  referer?: string;
};

export async function retrieveRelevantChunks(input: RetrieveRelevantChunksInput) {
  const query = input.query.trim();

  if (!input.userId) {
    throw new Error('Missing userId for knowledge retrieval.');
  }

  if (!query) {
    throw new Error('Missing query for knowledge retrieval.');
  }

  const embedding = await createTextEmbedding(query, input.referer);
  const matchCount = input.matchCount ?? ragEnv.defaultMatchCount();
  const matchThreshold = input.matchThreshold ?? ragEnv.defaultMatchThreshold();
  const minMatchThreshold = ragEnv.minMatchThreshold();

  const strictMatches = await matchKnowledgeChunks({
    userId: input.userId,
    embedding,
    matchCount,
    matchThreshold,
  });

  if (strictMatches.length > 0 || matchThreshold <= minMatchThreshold) {
    return strictMatches;
  }

  return matchKnowledgeChunks({
    userId: input.userId,
    embedding,
    matchCount,
    matchThreshold: minMatchThreshold,
  });
}
