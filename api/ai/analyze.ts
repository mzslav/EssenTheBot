import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ragEnv } from '../rag/_lib/env.js';
import { validateImagePayload } from '../rag/_lib/image.js';
import {
  ApiError,
  applyCors,
  authenticateTelegramRequest,
  handleCorsPreflight,
  sendApiError,
} from '../rag/_shared.js';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
};

function validateAnalyzeMessages(rawMessages: unknown) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new ApiError(400, 'Messages are required');
  }

  if (rawMessages.length > 12) {
    throw new ApiError(413, 'Too many messages in one request.');
  }

  let totalTextLength = 0;
  let totalImageBytes = 0;
  const messages = rawMessages as OpenRouterMessage[];

  for (const message of messages) {
    if (!message || !['system', 'user', 'assistant'].includes(message.role)) {
      throw new ApiError(400, 'Invalid message format.');
    }

    if (typeof message.content === 'string') {
      totalTextLength += message.content.length;
      continue;
    }

    if (!Array.isArray(message.content) || !message.content.length) {
      throw new ApiError(400, 'Invalid message content.');
    }

    for (const part of message.content) {
      if (part.type === 'text') {
        const text = typeof part.text === 'string' ? part.text : '';
        totalTextLength += text.length;
        continue;
      }

      if (part.type === 'image_url') {
        const validatedImage = validateImagePayload({
          dataUrl: part.image_url?.url,
          mimeType: /^data:([^;]+);base64,/u.exec(part.image_url?.url || '')?.[1] || '',
        });

        if (!validatedImage) {
          throw new ApiError(400, 'Invalid image content.');
        }

        totalImageBytes += validatedImage.bytes.length;
        continue;
      }

      throw new ApiError(400, 'Unsupported message content.');
    }
  }

  if (totalTextLength > ragEnv.maxTextChars()) {
    throw new ApiError(413, 'Messages are too large.');
  }

  if (totalImageBytes > ragEnv.maxImageBytes()) {
    throw new ApiError(413, 'Image payload is too large.');
  }

  return messages;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCors(req, res);

  const API_KEY = process.env.OPENROUTER_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not configured on server' });
  }

  try {
    const { referer } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'ai-analyze',
      maxRequests: ragEnv.analyzeRateLimitMaxRequests(),
      windowSeconds: ragEnv.analyzeRateLimitWindowSeconds(),
    });
    const messages = validateAnalyzeMessages(req.body?.messages);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer || 'https://essenthebot.vercel.app',
        'X-Title': 'EssenTheBot',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite-preview-09-2025',
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: unknown) {
    return sendApiError(res, error);
  }
}
