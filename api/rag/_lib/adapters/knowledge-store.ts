import { createSupabaseServiceClient } from './supabase';

type JsonObject = Record<string, unknown>;

type KnowledgeChunkInput = {
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokenCount?: number;
  metadata?: JsonObject;
  contentHash?: string;
};

type SaveKnowledgeDocumentInput = {
  userId: number;
  title: string;
  content: string;
  sourceType?: string;
  sourceRef?: string;
  metadata?: JsonObject;
  sourceHash?: string;
  chunks: KnowledgeChunkInput[];
};

type UpdateSingleChunkKnowledgeDocumentInput = {
  documentId: string;
  userId: number;
  title: string;
  content: string;
  sourceType: string;
  metadata?: JsonObject;
  chunk: KnowledgeChunkInput;
};

type KnowledgeDocumentRow = {
  id: string;
  title?: string;
  source_type?: string;
  source_ref?: string | null;
  source_hash?: string | null;
};

type KnowledgeChunkRow = {
  id: string;
};

type MatchKnowledgeChunkRow = {
  id: string;
  document_id: string;
  user_id: number;
  chunk_index: number;
  document_title: string;
  source_type: string;
  content: string;
  metadata: JsonObject;
  similarity: number;
};

function isSyntheticMetadata(metadata: JsonObject | null | undefined) {
  return metadata?.synthetic === true;
}

type SnapshotChunkRow = {
  id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  embedding: number[] | string;
  metadata: JsonObject | null;
  content_hash: string | null;
};

type SnapshotDocumentWithChunksRow = {
  id: string;
  title: string;
  source_type: string;
  source_ref: string | null;
  content: string;
  metadata: JsonObject | null;
  source_hash: string | null;
  source_version: number | null;
  knowledge_chunks: SnapshotChunkRow[] | null;
};

type MatchKnowledgeChunksInput = {
  userId: number;
  embedding: number[];
  matchCount?: number;
  matchThreshold?: number;
};

type ManualKnowledgeDocumentRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function deleteKnowledgeDocument(input: {
  userId: number;
  sourceType: string;
  sourceRef: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('user_id', input.userId)
    .eq('source_type', input.sourceType)
    .eq('source_ref', input.sourceRef);

  if (error) {
    throw new Error(`Failed to delete knowledge document: ${error.message}`);
  }
}

export async function deleteKnowledgeDocumentById(input: {
  userId: number;
  documentId: string;
  sourceType?: string;
}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', input.documentId)
    .eq('user_id', input.userId);

  if (input.sourceType) {
    query = query.eq('source_type', input.sourceType);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to delete knowledge document by id: ${error.message}`);
  }
}

export async function listManualKnowledgeDocuments(userId: number) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id,title,content,created_at,updated_at')
    .eq('user_id', userId)
    .eq('source_type', 'manual')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list manual knowledge documents: ${error.message}`);
  }

  return ((data ?? []) as ManualKnowledgeDocumentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveKnowledgeDocument(input: SaveKnowledgeDocumentInput) {
  if (!input.chunks.length) {
    throw new Error('Cannot save knowledge document without chunks.');
  }

  const supabase = createSupabaseServiceClient();

  if (input.sourceRef) {
    const { error: deleteExistingError } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('user_id', input.userId)
      .eq('source_type', input.sourceType ?? 'manual')
      .eq('source_ref', input.sourceRef);

    if (deleteExistingError) {
      throw new Error(`Failed to replace existing knowledge document: ${deleteExistingError.message}`);
    }
  }

  const { data: document, error: documentError } = await supabase
    .from('knowledge_documents')
    .insert({
      user_id: input.userId,
      title: input.title,
      source_type: input.sourceType ?? 'manual',
      source_ref: input.sourceRef ?? null,
      source_hash: input.sourceHash ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single<KnowledgeDocumentRow>();

  if (documentError || !document) {
    throw new Error(`Failed to save knowledge document: ${documentError?.message ?? 'No document returned'}`);
  }

  const chunkRows = input.chunks.map((chunk) => ({
    document_id: document.id,
    user_id: input.userId,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    token_count: chunk.tokenCount ?? null,
    embedding: chunk.embedding,
    metadata: chunk.metadata ?? {},
    content_hash: chunk.contentHash ?? null,
  }));

  const { data: chunks, error: chunksError } = await supabase
    .from('knowledge_chunks')
    .insert(chunkRows)
    .select('id');

  if (chunksError) {
    throw new Error(`Failed to save knowledge chunks: ${chunksError.message}`);
  }

  return {
    documentId: document.id,
    chunkIds: ((chunks ?? []) as KnowledgeChunkRow[]).map((chunk) => chunk.id),
  };
}

export async function updateSingleChunkKnowledgeDocument(input: UpdateSingleChunkKnowledgeDocumentInput) {
  const supabase = createSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from('knowledge_documents')
    .update({
      title: input.title,
      content: input.content,
      metadata: input.metadata ?? {},
      source_hash: input.chunk.contentHash ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.documentId)
    .eq('user_id', input.userId)
    .eq('source_type', input.sourceType)
    .select('id')
    .single<KnowledgeDocumentRow>();

  if (documentError || !document) {
    throw new Error(`Failed to update knowledge document: ${documentError?.message ?? 'No document returned'}`);
  }

  const chunkPayload = {
    document_id: input.documentId,
    user_id: input.userId,
    chunk_index: input.chunk.chunkIndex,
    content: input.chunk.content,
    token_count: input.chunk.tokenCount ?? null,
    embedding: input.chunk.embedding,
    metadata: input.chunk.metadata ?? {},
    content_hash: input.chunk.contentHash ?? null,
  };

  const { data: chunks, error: chunkError } = await supabase
    .from('knowledge_chunks')
    .upsert(chunkPayload, {
      onConflict: 'document_id,chunk_index',
    })
    .select('id');

  if (chunkError) {
    throw new Error(`Failed to update knowledge chunk: ${chunkError.message}`);
  }

  return {
    documentId: document.id,
    chunkIds: ((chunks ?? []) as KnowledgeChunkRow[]).map((chunk) => chunk.id),
  };
}

export async function matchKnowledgeChunks(input: MatchKnowledgeChunksInput) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    p_user_id: input.userId,
    p_query_embedding: input.embedding,
    p_match_count: input.matchCount,
    p_match_threshold: input.matchThreshold,
  });

  if (error) {
    throw new Error(`Failed to match knowledge chunks: ${error.message}`);
  }

  return ((data ?? []) as MatchKnowledgeChunkRow[]).filter((chunk) => !isSyntheticMetadata(chunk.metadata));
}

export async function getKnowledgeDocumentBySource(input: {
  userId: number;
  sourceType: string;
  sourceRef: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select(`
      id,
      title,
      source_type,
      source_ref,
      content,
      metadata,
      source_hash,
      source_version,
      knowledge_chunks (
        id,
        chunk_index,
        content,
        token_count,
        embedding,
        metadata,
        content_hash
      )
    `)
    .eq('user_id', input.userId)
    .eq('source_type', input.sourceType)
    .eq('source_ref', input.sourceRef)
    .maybeSingle<SnapshotDocumentWithChunksRow>();

  if (error) {
    throw new Error(`Failed to load knowledge document: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const parseEmbedding = (value: number[] | string) => {
    if (Array.isArray(value)) {
      return value;
    }

    try {
      return JSON.parse(value) as number[];
    } catch {
      throw new Error('Failed to parse stored embedding vector.');
    }
  };

  return {
    id: data.id,
    title: data.title,
    sourceType: data.source_type,
    sourceRef: data.source_ref,
    content: data.content,
    metadata: data.metadata ?? {},
    sourceHash: data.source_hash,
    sourceVersion: data.source_version ?? 1,
    chunks: [...(data.knowledge_chunks ?? [])]
      .sort((left, right) => left.chunk_index - right.chunk_index)
      .map((chunk) => ({
        id: chunk.id,
        chunkIndex: chunk.chunk_index,
        content: chunk.content,
        tokenCount: chunk.token_count ?? undefined,
        embedding: parseEmbedding(chunk.embedding),
        metadata: chunk.metadata ?? {},
        contentHash: chunk.content_hash,
      })),
  };
}

export async function upsertKnowledgeSnapshot(input: SaveKnowledgeDocumentInput & {
  sourceType: string;
  sourceRef: string;
}) {
  if (!input.chunks.length) {
    throw new Error('Cannot upsert knowledge snapshot without chunks.');
  }

  const supabase = createSupabaseServiceClient();
  const chunkPayload = input.chunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    tokenCount: chunk.tokenCount ?? null,
    embedding: chunk.embedding,
    metadata: chunk.metadata ?? {},
    contentHash: chunk.contentHash ?? null,
  }));

  const { data, error } = await supabase.rpc('upsert_knowledge_snapshot', {
    p_user_id: input.userId,
    p_title: input.title,
    p_source_type: input.sourceType,
    p_source_ref: input.sourceRef,
    p_content: input.content,
    p_metadata: input.metadata ?? {},
    p_source_hash: input.sourceHash ?? null,
    p_chunks: chunkPayload,
  });

  if (error) {
    throw new Error(`Failed to upsert knowledge snapshot: ${error.message}`);
  }

  const documentId = Array.isArray(data) && data[0]?.saved_document_id
    ? String(data[0].saved_document_id)
    : typeof data === 'object' && data && 'saved_document_id' in data
      ? String((data as { saved_document_id: string }).saved_document_id)
      : null;

  if (!documentId) {
    throw new Error('Knowledge snapshot upsert did not return document id.');
  }

  const { data: chunkRows, error: chunkError } = await supabase
    .from('knowledge_chunks')
    .select('id')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (chunkError) {
    throw new Error(`Failed to load saved knowledge chunks: ${chunkError.message}`);
  }

  return {
    documentId,
    chunkIds: ((chunkRows ?? []) as KnowledgeChunkRow[]).map((chunk) => chunk.id),
  };
}
