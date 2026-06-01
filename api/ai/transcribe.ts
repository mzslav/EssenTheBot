import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'AssemblyAI API key not configured on server' });
  }

  const { action, transcriptId } = req.body;

  try {
    if (action === 'upload') {
      const { audioBase64 } = req.body;
      const buffer = Buffer.from(audioBase64, 'base64');

      const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          authorization: API_KEY,
          'content-type': 'application/octet-stream',
        },
        body: buffer,
      });

      if (!uploadResp.ok) {
        const errorText = await uploadResp.text();
        return res.status(uploadResp.status).json({ error: errorText });
      }

      const data = await uploadResp.json();
      return res.status(200).json(data);
    }

    if (action === 'transcribe') {
      const { audioUrl } = req.body;
      const transcriptResp = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          authorization: API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speech_models: ['universal-3-pro', 'universal-2'],
          language_code: 'uk',
          punctuate: true,
          format_text: true,
        }),
      });

      if (!transcriptResp.ok) {
        const errorData = await transcriptResp.json();
        return res.status(transcriptResp.status).json({ error: errorData.error });
      }

      const data = await transcriptResp.json();
      return res.status(200).json(data);
    }

    if (action === 'status') {
      const statusResp = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { authorization: API_KEY } }
      );

      if (!statusResp.ok) {
        return res.status(statusResp.status).json({ error: 'Status check failed' });
      }

      const data = await statusResp.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
