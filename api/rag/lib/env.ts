function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

function readNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const ragEnv = {
  openRouterApiKey: () => readRequiredEnv('OPENROUTER_API_KEY'),
  openRouterEmbeddingModel: () =>
    process.env.OPENROUTER_EMBEDDING_MODEL || 'nvidia/llama-nemotron-embed-vl-1b-v2:free',
  openRouterModel: () =>
    process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite-preview-09-2025',
  openRouterAppUrl: () => process.env.OPENROUTER_APP_URL || 'https://essenthebot.vercel.app',
  openRouterAppTitle: () => process.env.OPENROUTER_APP_TITLE || 'EssenTheBot',
  supabaseUrl: () => readRequiredEnv('SUPABASE_URL'),
  supabaseServiceKey: () => readRequiredEnv('SUPABASE_SERVICE_KEY'),
  defaultMatchCount: () => readNumberEnv('RAG_MATCH_COUNT', 8),
  defaultMatchThreshold: () => readNumberEnv('RAG_MATCH_THRESHOLD', 0.72),
  minMatchThreshold: () => readNumberEnv('RAG_MIN_MATCH_THRESHOLD', 0.18),
  maxImageBytes: () => readNumberEnv('AI_MAX_IMAGE_BYTES', 2_500_000),
  maxTextChars: () => readNumberEnv('AI_MAX_TEXT_CHARS', 12000),
  chatRateLimitWindowSeconds: () => readNumberEnv('RAG_CHAT_RATE_LIMIT_WINDOW_SECONDS', 60),
  chatRateLimitMaxRequests: () => readNumberEnv('RAG_CHAT_RATE_LIMIT_MAX_REQUESTS', 20),
  ingestRateLimitWindowSeconds: () => readNumberEnv('RAG_INGEST_RATE_LIMIT_WINDOW_SECONDS', 300),
  ingestRateLimitMaxRequests: () => readNumberEnv('RAG_INGEST_RATE_LIMIT_MAX_REQUESTS', 20),
  syncRateLimitWindowSeconds: () => readNumberEnv('RAG_SYNC_RATE_LIMIT_WINDOW_SECONDS', 300),
  syncRateLimitMaxRequests: () => readNumberEnv('RAG_SYNC_RATE_LIMIT_MAX_REQUESTS', 12),
  analyzeRateLimitWindowSeconds: () => readNumberEnv('AI_ANALYZE_RATE_LIMIT_WINDOW_SECONDS', 60),
  analyzeRateLimitMaxRequests: () => readNumberEnv('AI_ANALYZE_RATE_LIMIT_MAX_REQUESTS', 20),
  transcribeRateLimitWindowSeconds: () => readNumberEnv('TRANSCRIBE_RATE_LIMIT_WINDOW_SECONDS', 300),
  transcribeRateLimitMaxRequests: () => readNumberEnv('TRANSCRIBE_RATE_LIMIT_MAX_REQUESTS', 20),
  transcribeStatusRateLimitWindowSeconds: () => readNumberEnv('TRANSCRIBE_STATUS_RATE_LIMIT_WINDOW_SECONDS', 60),
  transcribeStatusRateLimitMaxRequests: () => readNumberEnv('TRANSCRIBE_STATUS_RATE_LIMIT_MAX_REQUESTS', 60),
  maxAudioBytes: () => readNumberEnv('AI_MAX_AUDIO_BYTES', 4_000_000),
};
