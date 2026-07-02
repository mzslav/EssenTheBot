import { loadLocalEnv, requireEnv } from './load-env.ts';

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

loadLocalEnv();

const model = process.env.OPENROUTER_EMBEDDING_MODEL || 'qwen/qwen3-embedding-8b';
const expectedDimensions = Number(process.env.RAG_EMBEDDING_DIMENSIONS || 4000);

const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${requireEnv('OPENROUTER_API_KEY')}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_APP_URL || 'https://essenthebot.vercel.app',
    'X-Title': process.env.OPENROUTER_APP_TITLE || 'EssenTheBot',
  },
  body: JSON.stringify({
    model,
    input: 'Embedding dimension check for EssenTheBot RAG migration.',
    dimensions: expectedDimensions,
    encoding_format: 'float',
  }),
});

const text = await response.text();
const data = text.trim() ? JSON.parse(text) as EmbeddingResponse : null;

if (!response.ok) {
  const details = data?.error?.message || text || `HTTP ${response.status}`;
  throw new Error(`OpenRouter embedding check failed: ${details}`);
}

const embedding = data?.data?.[0]?.embedding;
if (!Array.isArray(embedding)) {
  throw new Error('OpenRouter embedding check did not return an embedding array.');
}

const result = {
  model,
  dimensions: embedding.length,
  expectedDimensions,
  matchesExpected: embedding.length === expectedDimensions,
};

console.log(JSON.stringify(result, null, 2));

if (!result.matchesExpected) {
  process.exitCode = 1;
}
