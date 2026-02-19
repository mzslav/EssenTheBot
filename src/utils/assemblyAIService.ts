const ASSEMBLYAI_API_KEY = import.meta.env.VITE_ASSEMBLYAI_API_KEY;


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
    source.channelCount = 1; 
    source.channelInterpretation = 'speakers';  
    
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    audioBuffer = await offlineContext.startRendering(); 
    
    console.log('Resampled:', audioBuffer.duration, 's,', audioBuffer.sampleRate, 'Hz');
    
    return new Blob([audioBufferToWav(audioBuffer)], { type: 'audio/wav' });
  } catch (error) {
    console.error('Конвертація failed:', error);
    throw new Error('Не вдалося обробити аудіо');
  }
}


async function uploadAudio(audioBlob: Blob): Promise<string> {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY не встановлено в .env');
  }


  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { 
      'authorization': ASSEMBLYAI_API_KEY,
      'content-type': 'application/octet-stream' 
    },
    body: audioBlob 
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Помилка завантаження:', response.status, errorText);
    throw new Error(`Помилка завантаження: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Upload URL:', data.upload_url);
  return data.upload_url;
}


async function createTranscription(audioUrl: string): Promise<string> {
  const requestBody = {
    audio_url: audioUrl,
    speech_models: ["universal-3-pro", "universal-2"], 
    language_code: "uk",
    punctuate: true,
    format_text: true
  };

  console.log('Запит (Universal-3 UK):', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('API Error:', errorData);
    throw new Error(`Помилка API (${response.status}): ${errorData.error}`);
  }

  const data = await response.json();
  return data.id;
}


async function checkTranscriptionStatus(transcriptId: string) {
  const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    headers: { authorization: ASSEMBLYAI_API_KEY }
  });

  if (!response.ok) throw new Error('Помилка статусу');

  return await response.json();
}


export async function transcribeAudio(
  rawAudioBlob: Blob,
  onProgress?: (status: string) => void
): Promise<string> {
  try {
    onProgress?.('Обробка аудіо...');
    const audioBlob = await convertBlobToWav(rawAudioBlob);
    console.log('WAV blob:', audioBlob.size, audioBlob.type);

    if (audioBlob.size < 2000) {
      throw new Error('Запис занадто короткий або порожній (говорити 3+ сек)');
    }

    onProgress?.('Завантаження...');
    const audioUrl = await uploadAudio(audioBlob);

    onProgress?.('Розпізнавання...');
    const transcriptId = await createTranscription(audioUrl);

    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 2500));
      const result = await checkTranscriptionStatus(transcriptId);
      
      console.log(`Статус: ${result.status}`);
      
      if (result.status === 'completed') {
        if (!result.text?.trim()) {
          throw new Error('Не вдалося розпізнати голос. Говоріть чіткіше або довше.');
        }
        return result.text.trim();
      }
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Помилка API');
      }
      
      attempts++;
      onProgress?.(`Розпізнавання... ${attempts * 2.5}с`);
    }
    
    throw new Error('Таймаут обробки');
  } catch (error) {
    console.error('Транскрипція failed:', error);
    throw error;
  }
}
