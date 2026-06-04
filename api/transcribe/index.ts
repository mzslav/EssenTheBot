import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ASSEMBLYAI_API_KEY) {
    return res.status(500).json({ error: 'AssemblyAI API key not configured' });
  }

  try {
    const { action, audioBase64, audioUrl, transcriptId, languageCode } = req.body;

    if (action === 'upload') {
      if (!audioBase64) {
        return res.status(400).json({ error: 'Missing audioBase64' });
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
      if (!audioUrl) {
        return res.status(400).json({ error: 'Missing audioUrl' });
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
      if (!transcriptId) {
        return res.status(400).json({ error: 'Missing transcriptId' });
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

    return res.status(400).json({ error: 'Invalid action. Use: upload, transcribe, or status' });
  } catch (error: any) {
    console.error('Transcribe proxy error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
