import { buildApiUrl } from './apiUrl';

function getTelegramInitData() {
  return ((window.Telegram?.WebApp as { initData?: string } | undefined)?.initData) || '';
}

function getTelegramUserId() {
  const user = (window.Telegram?.WebApp as { initDataUnsafe?: { user?: { id?: number } } } | undefined)?.initDataUnsafe?.user;
  return user?.id;
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, buffer.length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}

export async function convertBlobToWav(inputBlob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await inputBlob.arrayBuffer();
    const audioContext = new AudioContext();
    let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const offlineContext = new OfflineAudioContext(
      1,
      Math.floor(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    audioBuffer = await offlineContext.startRendering();
    return new Blob([audioBufferToWav(audioBuffer)], { type: 'audio/wav' });
  } catch {
    throw new Error('error_audio_processing');
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadAudio(audioBlob: Blob): Promise<string> {
  const base64 = await blobToBase64(audioBlob);
  const telegramInitData = getTelegramInitData();
  const telegramUserId = getTelegramUserId();

  const response = await fetch(buildApiUrl('/api/transcribe'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'upload', audioBase64: base64, telegramInitData, telegramUserId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`error_upload: ${response.status} - ${errorData.error}`);
  }

  const data = await response.json();
  return data.upload_url;
}

async function createTranscription(audioUrl: string, languageCode: string): Promise<string> {
  const telegramInitData = getTelegramInitData();
  const telegramUserId = getTelegramUserId();
  const response = await fetch(buildApiUrl('/api/transcribe'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'transcribe', audioUrl, languageCode, telegramInitData, telegramUserId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`error_api: ${response.status} - ${errorData.error}`);
  }

  const data = await response.json();
  return data.id;
}

async function checkTranscriptionStatus(transcriptId: string): Promise<{ status: string; text?: string; error?: string }> {
  const telegramInitData = getTelegramInitData();
  const telegramUserId = getTelegramUserId();
  const response = await fetch(buildApiUrl('/api/transcribe'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'status', transcriptId, telegramInitData, telegramUserId }),
  });

  if (!response.ok) throw new Error('error_status');
  return await response.json();
}

export async function transcribeAudio(
  rawAudioBlob: Blob,
  languageCode: string,
  onProgress?: (status: string) => void
): Promise<string> {
  onProgress?.('processing_audio');
  const audioBlob = await convertBlobToWav(rawAudioBlob);

  if (audioBlob.size < 2000) {
    throw new Error('error_audio_too_short');
  }

  onProgress?.('uploading');
  const audioUrl = await uploadAudio(audioBlob);

  onProgress?.('recognizing');
  const transcriptId = await createTranscription(audioUrl, languageCode);

  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 2500));
    const result = await checkTranscriptionStatus(transcriptId);

    if (result.status === 'completed') {
      if (!result.text?.trim()) {
        throw new Error('error_voice_not_recognized');
      }
      return result.text.trim();
    }

    if (result.status === 'error') {
      throw new Error(result.error || 'error_api');
    }

    attempts++;
    onProgress?.('recognizing');
  }

  throw new Error('error_timeout');
}
