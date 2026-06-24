import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ingestTextDocument } from './lib/modules/ingest-text-document';
import { ragEnv } from './lib/env';
import {
  ApiError,
  applyCors,
  assertMaxTextLength,
  authenticateTelegramRequest,
  handleCorsPreflight,
  sendApiError,
} from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCors(req, res);

  try {
    const { user, referer } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'rag-ingest',
      maxRequests: ragEnv.ingestRateLimitMaxRequests(),
      windowSeconds: ragEnv.ingestRateLimitWindowSeconds(),
    });

    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!title.trim()) {
      throw new ApiError(400, 'Missing title for text ingestion.');
    }
    if (!content.trim()) {
      throw new ApiError(400, 'Missing content for text ingestion.');
    }
    assertMaxTextLength('Title', title, 200);
    assertMaxTextLength('Content', content, ragEnv.maxTextChars());

    const result = await ingestTextDocument({
      userId: user.id,
      title,
      content,
      sourceType: 'manual',
      sourceRef: undefined,
      metadata: undefined,
      referer,
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return sendApiError(res, error);
  }
}
