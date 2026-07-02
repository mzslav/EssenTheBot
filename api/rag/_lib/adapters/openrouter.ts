import { ragEnv } from '../env.js';

type OpenRouterEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

type OpenRouterContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type OpenRouterChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenRouterContentPart[];
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`OpenRouter returned invalid JSON: ${text.slice(0, 300)}`);
  }
}

function getOpenRouterHeaders(referer?: string) {
  return {
    Authorization: `Bearer ${ragEnv.openRouterApiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': referer || ragEnv.openRouterAppUrl(),
    'X-Title': ragEnv.openRouterAppTitle(),
  };
}

function buildOpenRouterError(prefix: string, data: { error?: { message?: string } } | null, status: number) {
  const details = data?.error?.message;
  return details ? `${prefix}: ${details}` : `${prefix}: HTTP ${status}`;
}

export async function createEmbedding(input: string, referer?: string) {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: getOpenRouterHeaders(referer),
    body: JSON.stringify({
      model: ragEnv.openRouterEmbeddingModel(),
      input,
      dimensions: ragEnv.embeddingDimensions(),
      encoding_format: 'float',
    }),
  });

  const data = await parseJsonResponse<OpenRouterEmbeddingResponse>(response);

  if (!response.ok) {
    throw new Error(buildOpenRouterError('OpenRouter embedding request failed', data, response.status));
  }

  const embedding = data?.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error('OpenRouter embedding response does not contain an embedding array.');
  }

  const expectedDimensions = ragEnv.embeddingDimensions();
  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `OpenRouter embedding dimension mismatch for ${ragEnv.openRouterEmbeddingModel()}: expected ` +
      `${expectedDimensions}, received ${embedding.length}.`
    );
  }

  return embedding;
}

type ChatCompletionOptions = {
  jsonResponse?: boolean;
  model?: string;
  maxTokens?: number;
};

export async function createChatCompletion(
  messages: OpenRouterChatMessage[],
  referer?: string,
  options: ChatCompletionOptions = {}
) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: getOpenRouterHeaders(referer),
    body: JSON.stringify({
      model: options.model ?? ragEnv.openRouterModel(),
      messages,
      temperature: 0.3,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...(options.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const data = await parseJsonResponse<OpenRouterChatResponse>(response);

  if (!response.ok) {
    throw new Error(buildOpenRouterError('OpenRouter chat request failed', data, response.status));
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenRouter chat response did not contain message content.');
  }

  return content;
}
