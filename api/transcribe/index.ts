import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ragEnv } from '../rag/_lib/env';
import {
  ApiError,
  applyCors,
  authenticateTelegramRequest,
  handleCorsPreflight,
  sendApiError,
} from '../rag/_shared';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

function estimateBase64Size(base64: string) {
  return Math.floor((base64.length * 3) / 4);
}

function validateAction(action: unknown) {
  if (typeof action !== 'string' || !action.trim()) {
    throw new ApiError(400, 'Missing action');
  }

  if (!['upload', 'transcribe', 'status'].includes(action)) {
    throw new ApiError(400, 'Invalid action. Use: upload, transcribe, or status');
  }

  return action;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ASSEMBLYAI_API_KEY) {
    return res.status(500).json({ error: 'AssemblyAI API key not configured' });
  }

  try {
    const action = validateAction(req.body?.action);
    await authenticateTelegramRequest(req, action === 'status'
      ? {
          rateLimitKey: 'transcribe-status',
          maxRequests: ragEnv.transcribeStatusRateLimitMaxRequests(),
          windowSeconds: ragEnv.transcribeStatusRateLimitWindowSeconds(),
        }
      : {
          rateLimitKey: 'transcribe',
          maxRequests: ragEnv.transcribeRateLimitMaxRequests(),
          windowSeconds: ragEnv.transcribeRateLimitWindowSeconds(),
        });
    const { audioBase64, audioUrl, transcriptId, languageCode } = req.body;

    if (action === 'upload') {
      if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
        throw new ApiError(400, 'Missing audioBase64');
      }

      if (estimateBase64Size(audioBase64) > ragEnv.maxAudioBytes()) {
        throw new ApiError(413, 'Audio payload is too large.');
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');

      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
        },
        body: audioBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        return res.status(uploadResponse.status).json({ error: `Upload failed: ${errorText}` });
      }

      const data = await uploadResponse.json();
      return res.status(200).json({ upload_url: data.upload_url });
    }

    if (action === 'transcribe') {
      if (typeof audioUrl !== 'string' || !audioUrl.trim()) {
        throw new ApiError(400, 'Missing audioUrl');
      }

      const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speech_models: ['universal-3-pro', 'universal-2'],
          language_code: languageCode || 'uk',
          punctuate: true,
          format_text: true,
        }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        return res.status(transcribeResponse.status).json({ error: errorData.error || 'Transcription failed' });
      }

      const data = await transcribeResponse.json();
      return res.status(200).json({ id: data.id });
    }

    if (action === 'status') {
      if (typeof transcriptId !== 'string' || !transcriptId.trim()) {
        throw new ApiError(400, 'Missing transcriptId');
      }

      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: ASSEMBLYAI_API_KEY },
      });

      if (!statusResponse.ok) {
        return res.status(statusResponse.status).json({ error: 'Status check failed' });
      }

      const data = await statusResponse.json();
      return res.status(200).json({ status: data.status, text: data.text, error: data.error });
    }

  } catch (error: unknown) {
    return sendApiError(res, error);
  }
}
