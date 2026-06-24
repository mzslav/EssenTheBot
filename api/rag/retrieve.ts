import type { VercelRequest, VercelResponse } from '@vercel/node';

import { retrieveRelevantChunks } from './lib/modules/retrieve-relevant-chunks';
import { ragEnv } from './lib/env';
import {
  ApiError,
  assertMaxTextLength,
  authenticateTelegramRequest,
  sendApiError,
} from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query : '';
    if (!query.trim()) {
      throw new ApiError(400, 'Missing query for knowledge retrieval.');
    }
    assertMaxTextLength('Query', query, ragEnv.maxTextChars());

    const { user, referer } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'rag-retrieve',
      maxRequests: ragEnv.chatRateLimitMaxRequests(),
      windowSeconds: ragEnv.chatRateLimitWindowSeconds(),
    });
    const results = await retrieveRelevantChunks({
      userId: user.id,
      query,
      matchCount: typeof req.body?.matchCount === 'number' ? req.body.matchCount : undefined,
      matchThreshold: typeof req.body?.matchThreshold === 'number' ? req.body.matchThreshold : undefined,
      referer,
    });

    return res.status(200).json({ ok: true, results });
  } catch (error) {
    return sendApiError(res, error);
  }
}
