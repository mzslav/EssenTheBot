import {
  getKnowledgeDocumentBySource,
  saveKnowledgeDocument,
  updateSingleChunkKnowledgeDocument,
  upsertKnowledgeSnapshot,
} from '../adapters/knowledge-store.js';
import { createContentHash } from '../hash.js';
import { createTextEmbedding } from './create-text-embedding.js';

type JsonObject = Record<string, unknown>;

type IngestTextDocumentInput = {
  userId: number;
  title: string;
  content: string;
  sourceType?: string;
  sourceRef?: string;
  metadata?: JsonObject;
  referer?: string;
};

type TextChunkInput = {
  content: string;
  metadata?: JsonObject;
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function estimateTokenCount(text: string) {
  return Math.ceil(text.length / 4);
}

function buildSingleChunk(text: string, embedding: number[], metadata?: JsonObject) {
  return {
    chunkIndex: 0,
    content: text,
    embedding,
    tokenCount: estimateTokenCount(text),
    contentHash: createContentHash(text),
    metadata: {
      ...(metadata ?? {}),
      chunkingStrategy: 'single_chunk',
    },
  };
}

async function createEmbeddingsWithConcurrency(
  chunks: Array<{ content: string }>,
  referer?: string,
  concurrency = 3
) {
  const embeddings: number[][] = new Array(chunks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < chunks.length) {
      const index = nextIndex;
      nextIndex += 1;
      embeddings[index] = await createTextEmbedding(chunks[index].content, referer);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, () => worker())
  );
  return embeddings;
}

async function saveSnapshotDocument(
  input: IngestTextDocumentInput & {
    sourceType: string;
    sourceRef: string;
    chunks: TextChunkInput[];
  }
) {
  const content = input.chunks.map((chunk) => chunk.content).join('\n\n');
  const sourceHash = createContentHash(`${input.title.trim()}\n${content}`);
  const existing = await getKnowledgeDocumentBySource({
    userId: input.userId,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
  });

  if (existing?.sourceHash === sourceHash && existing.chunks.length > 0) {
    return {
      documentId: existing.id,
      chunkIds: existing.chunks.map((chunk) => chunk.id),
      skipped: true,
    };
  }

  const existingChunksByIndex = new Map(
    (existing?.chunks ?? []).map((chunk) => [chunk.chunkIndex, chunk])
  );
  const chunkPayload = input.chunks.map((chunk, index) => {
    const normalizedContent = normalizeText(chunk.content);
    return {
      chunkIndex: index,
      content: normalizedContent,
      tokenCount: estimateTokenCount(normalizedContent),
      contentHash: createContentHash(normalizedContent),
      metadata: {
        ...(input.metadata ?? {}),
        ...(chunk.metadata ?? {}),
      },
    };
  });

  const changedChunks = chunkPayload.filter((chunk) => {
    const existingChunk = existingChunksByIndex.get(chunk.chunkIndex);
    return !existingChunk || existingChunk.contentHash !== chunk.contentHash;
  });
  const changedEmbeddings = changedChunks.length
    ? await createEmbeddingsWithConcurrency(changedChunks, input.referer)
    : [];
  const embeddingByChunkIndex = new Map<number, number[]>();
  changedChunks.forEach((chunk, index) => {
    embeddingByChunkIndex.set(chunk.chunkIndex, changedEmbeddings[index]);
  });

  return upsertKnowledgeSnapshot({
    userId: input.userId,
    title: input.title.trim(),
    content,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    sourceHash,
    metadata: input.metadata,
    chunks: chunkPayload.map((chunk) => {
      const existingChunk = existingChunksByIndex.get(chunk.chunkIndex);
      const embedding = embeddingByChunkIndex.get(chunk.chunkIndex) ?? existingChunk?.embedding;

      if (!embedding) {
        throw new Error(`Missing embedding for chunk ${chunk.chunkIndex}.`);
      }

      return {
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding,
        tokenCount: chunk.tokenCount,
        metadata: chunk.metadata,
        contentHash: chunk.contentHash,
      };
    }),
  });
}

export async function ingestChunkedTextDocument(
  input: IngestTextDocumentInput & { chunks: TextChunkInput[] }
) {
  const title = input.title.trim();
  const chunks = input.chunks
    .map((chunk) => ({
      content: normalizeText(chunk.content),
      metadata: {
        ...(input.metadata ?? {}),
        ...(chunk.metadata ?? {}),
      },
    }))
    .filter((chunk) => chunk.content);

  if (!input.userId) {
    throw new Error('Missing userId for text ingestion.');
  }

  if (!title) {
    throw new Error('Missing title for text ingestion.');
  }

  if (!chunks.length) {
    throw new Error('Missing chunks for text ingestion.');
  }

  if (input.sourceRef && input.sourceType) {
    return saveSnapshotDocument({
      ...input,
      title,
      chunks,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
    });
  }

  const embeddings = await createEmbeddingsWithConcurrency(chunks, input.referer);
  const content = chunks.map((chunk) => chunk.content).join('\n\n');

  return saveKnowledgeDocument({
    userId: input.userId,
    title,
    content,
    sourceType: input.sourceType ?? 'manual',
    sourceRef: input.sourceRef,
    sourceHash: createContentHash(`${title}\n${content}`),
    metadata: input.metadata,
    chunks: chunks.map((chunk, index) => ({
      ...buildSingleChunk(chunk.content, embeddings[index], chunk.metadata),
      chunkIndex: index,
    })),
  });
}

export async function ingestTextDocument(input: IngestTextDocumentInput) {
  const content = normalizeText(input.content);
  const title = input.title.trim();

  if (!input.userId) {
    throw new Error('Missing userId for text ingestion.');
  }

  if (!title) {
    throw new Error('Missing title for text ingestion.');
  }

  if (!content) {
    throw new Error('Missing content for text ingestion.');
  }

  if (input.sourceRef && input.sourceType) {
    return saveSnapshotDocument({
      ...input,
      title,
      content,
      chunks: [{ content, metadata: input.metadata }],
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
    });
  }

  const embedding = await createTextEmbedding(content, input.referer);

  return saveKnowledgeDocument({
    userId: input.userId,
    title,
    content,
    sourceType: input.sourceType ?? 'manual',
    sourceRef: input.sourceRef,
    sourceHash: createContentHash(`${title}\n${content}`),
    metadata: input.metadata,
    chunks: [
      buildSingleChunk(content, embedding, input.metadata),
    ],
  });
}

export async function updateTextDocument(input: IngestTextDocumentInput & { documentId: string }) {
  const content = normalizeText(input.content);
  const title = input.title.trim();

  if (!input.documentId) {
    throw new Error('Missing documentId for text update.');
  }

  if (!input.userId) {
    throw new Error('Missing userId for text update.');
  }

  if (!title) {
    throw new Error('Missing title for text update.');
  }

  if (!content) {
    throw new Error('Missing content for text update.');
  }

  const embedding = await createTextEmbedding(content, input.referer);

  return updateSingleChunkKnowledgeDocument({
    documentId: input.documentId,
    userId: input.userId,
    title,
    content,
    sourceType: input.sourceType ?? 'manual',
    metadata: input.metadata,
    chunk: buildSingleChunk(content, embedding, input.metadata),
  });
}
