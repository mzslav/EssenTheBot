import type { VercelRequest, VercelResponse } from '@vercel/node';

import { createRagChatAnswer } from './_lib/modules/create-rag-chat-answer.js';
import { ragEnv } from './_lib/env.js';
import { validateImagePayload } from './_lib/image.js';
import {
  ApiError,
  applyCors,
  assertMaxTextLength,
  authenticateTelegramRequest,
  handleCorsPreflight,
  isProductionEnvironment,
  sendApiError,
} from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCors(req, res);

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message : '';
    assertMaxTextLength('Message', message, ragEnv.maxTextChars());
    const image = validateImagePayload(req.body?.image);
    const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = rawHistory
      .filter(
        (item): item is { role: 'user' | 'assistant'; content: string } =>
          !!item &&
          typeof item === 'object' &&
          ((item as any).role === 'user' || (item as any).role === 'assistant') &&
          typeof (item as any).content === 'string'
      )
      .map((item) => ({
        role: item.role,
        content: item.content.trim(),
      }))
      .filter((item) => item.content.length > 0);
    assertMaxTextLength(
      'History',
      history.map((item) => item.content).join('\n'),
      ragEnv.maxTextChars()
    );
    if (!message.trim() && !image) {
      throw new ApiError(400, 'Missing message or image for chat.');
    }
    const { user, referer } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'rag-chat',
      maxRequests: ragEnv.chatRateLimitMaxRequests(),
      windowSeconds: ragEnv.chatRateLimitWindowSeconds(),
    });
    const result = await createRagChatAnswer({
      userId: user.id,
      message,
      image: image ? { dataUrl: image.dataUrl, mimeType: image.mimeType } : undefined,
      history,
      matchCount: typeof req.body?.matchCount === 'number' ? req.body.matchCount : undefined,
      matchThreshold: typeof req.body?.matchThreshold === 'number' ? req.body.matchThreshold : undefined,
      referer,
    });

    return res.status(200).json({
      ok: true,
      answer: result.answer,
      highlights: result.highlights,
      sources: result.sources,
      ...(isProductionEnvironment() ? {} : { context: result.context }),
    });
  } catch (error) {
    return sendApiError(res, error);
  }
}
