import type { TelegramUser } from '../types/types';
import { buildApiUrl } from './apiUrl';

export type RagErrorCode =
  | 'missing_user'
  | 'network'
  | 'unauthorized'
  | 'rate_limited'
  | 'server'
  | 'invalid_response'
  | 'request_failed';

export class RagServiceError extends Error {
  code: RagErrorCode;
  resetAt?: string;

  constructor(code: RagErrorCode, options?: { resetAt?: string }) {
    super(code);
    this.name = 'RagServiceError';
    this.code = code;
    this.resetAt = options?.resetAt;
  }
}

type RagChatResponse = {
  ok: boolean;
  answer: string;
  highlights: string[];
  sources?: Array<{
    title: string;
    sourceType: string;
  }>;
  memorySuggestion?: {
    title: string;
    content: string;
  } | null;
  context?: Array<{
    id: string;
    document_id: string;
    user_id: number;
    chunk_index: number;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>;
};

type RagIngestResponse = {
  ok: boolean;
  documentId: string;
  chunkIds: string[];
};

type RagSyncResponse = {
  ok: boolean;
  syncedFrom: string;
  syncedAt: string;
  windows?: {
    nutritionHistoryDays: number;
    workoutHistoryDays: number;
    weightHistoryDays: number;
  };
  stats?: {
    totalChunks: number;
    embeddedChunks: number;
    reusedChunks: number;
    skippedChunks: number;
    deletedDocuments: number;
  };
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
};

export type ManualKnowledgeNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function getTelegramInitData() {
  return ((window.Telegram?.WebApp as { initData?: string } | undefined)?.initData) || '';
}

function buildTelegramPayload(user?: TelegramUser) {
  return {
    telegramUserId: user?.id,
    telegramInitData: getTelegramInitData(),
  };
}

async function requestJson<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new RagServiceError('network');
  }

  const rawText = await response.text();
  let data: unknown = {};

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new RagServiceError('invalid_response');
    }
  }

  if (!response.ok) {
    const errorPayload =
      data && typeof data === 'object' && data !== null
        ? data as { error?: string; resetAt?: string }
        : undefined;

    if (response.status === 401 || response.status === 403) {
      throw new RagServiceError('unauthorized', { resetAt: errorPayload?.resetAt });
    }
    if (response.status === 429) {
      throw new RagServiceError('rate_limited', { resetAt: errorPayload?.resetAt });
    }
    if (response.status >= 500) {
      throw new RagServiceError('server', { resetAt: errorPayload?.resetAt });
    }
    throw new RagServiceError('request_failed', { resetAt: errorPayload?.resetAt });
  }

  return data as T;
}

export async function syncKnowledge(user?: TelegramUser) {
  if (!user?.id) {
    throw new RagServiceError('missing_user');
  }

  return requestJson<RagSyncResponse>(buildApiUrl('/api/rag/sync'), {
    body: {
      ...buildTelegramPayload(user),
    },
  });
}

export type RagChatImage = {
  dataUrl: string;
  mimeType: string;
};

export type RagChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function sendChatMessage(
  user: TelegramUser | undefined,
  message: string,
  image?: RagChatImage,
  history?: RagChatHistoryMessage[]
) {
  if (!user?.id) {
    throw new RagServiceError('missing_user');
  }

  return requestJson<RagChatResponse>(buildApiUrl('/api/rag/chat'), {
    body: {
      ...buildTelegramPayload(user),
      message,
      ...(image ? { image } : {}),
      ...(history?.length ? { history } : {}),
    },
  });
}

export async function ingestManualKnowledge(
  user: TelegramUser | undefined,
  input: { title: string; content: string }
) {
  if (!user?.id) {
    throw new RagServiceError('missing_user');
  }

  return requestJson<RagIngestResponse>(buildApiUrl('/api/rag/ingest'), {
    body: {
      ...buildTelegramPayload(user),
      title: input.title,
      content: input.content,
      sourceType: 'manual',
    },
  });
}

export async function listManualKnowledge(user: TelegramUser | undefined) {
  if (!user?.id) {
    throw new RagServiceError('missing_user');
  }

  return requestJson<{ ok: boolean; notes: ManualKnowledgeNote[] }>(buildApiUrl('/api/rag/manual-knowledge'), {
    body: {
      ...buildTelegramPayload(user),
      action: 'list',
    },
  });
}

export async function updateManualKnowledge(
  user: TelegramUser | undefined,
  input: { documentId: string; title: string; content: string }
) {
  if (!user?.id) {
    throw new RagServiceError('missing_user');
  }

  return requestJson<RagIngestResponse>(buildApiUrl('/api/rag/manual-knowledge'), {
    body: {
      ...buildTelegramPayload(user),
      action: 'update',
      documentId: input.documentId,
      title: input.title,
      content: input.content,
    },
  });
}

export async function deleteManualKnowledge(user: TelegramUser | undefined, documentId: string) {
  if (!user?.id) {
    throw new RagServiceError('missing_user');
  }

  return requestJson<{ ok: boolean }>(buildApiUrl('/api/rag/manual-knowledge'), {
    body: {
      ...buildTelegramPayload(user),
      action: 'delete',
      documentId,
    },
  });
}
