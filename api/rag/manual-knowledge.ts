import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ragEnv } from './_lib/env.js';
import {
  deleteKnowledgeDocumentById,
  listManualKnowledgeDocuments,
} from './_lib/adapters/knowledge-store.js';
import { updateTextDocument } from './_lib/modules/ingest-text-document.js';
import {
  ApiError,
  assertMaxTextLength,
  authenticateTelegramRequest,
  applyCors,
  handleCorsPreflight,
  sendApiError,
} from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCors(req, res);

  try {
    const { user } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'rag-manual-knowledge',
      maxRequests: ragEnv.ingestRateLimitMaxRequests(),
      windowSeconds: ragEnv.ingestRateLimitWindowSeconds(),
    });
    const action = typeof req.body?.action === 'string' ? req.body.action : '';

    if (action === 'list') {
      const notes = await listManualKnowledgeDocuments(user.id);
      return res.status(200).json({ ok: true, notes });
    }

    if (action === 'delete') {
      const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId : '';

      if (!documentId) {
        throw new ApiError(400, 'Missing documentId');
      }

      await deleteKnowledgeDocumentById({
        userId: user.id,
        documentId,
        sourceType: 'manual',
      });

      return res.status(200).json({ ok: true });
    }

    if (action === 'update') {
      const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId : '';
      const title = typeof req.body?.title === 'string' ? req.body.title : '';
      const content = typeof req.body?.content === 'string' ? req.body.content : '';
      assertMaxTextLength('Title', title, 200);
      assertMaxTextLength('Content', content, ragEnv.maxTextChars());

      if (!documentId) {
        throw new ApiError(400, 'Missing documentId');
      }

      if (!title.trim()) {
        throw new ApiError(400, 'Missing title for manual knowledge update.');
      }

      if (!content.trim()) {
        throw new ApiError(400, 'Missing content for manual knowledge update.');
      }

      const result = await updateTextDocument({
        documentId,
        userId: user.id,
        title,
        content,
        sourceType: 'manual',
      });

      return res.status(200).json({ ok: true, ...result });
    }

    throw new ApiError(400, 'Unsupported action');
  } catch (error) {
    return sendApiError(res, error);
  }
}
