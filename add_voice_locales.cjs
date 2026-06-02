const fs = require('fs');

const data = {
  'uk.json': {
    processing_audio: "Обробка аудіо...",
    uploading: "Завантаження...",
    recognizing: "Розпізнавання...",
    error_audio_processing: "Не вдалося обробити аудіо",
    error_audio_too_short: "Запис занадто короткий або порожній (говорити 3+ сек)",
    error_voice_not_recognized: "Не вдалося розпізнати голос. Говоріть чіткіше або довше.",
    error_api: "Помилка API",
    error_timeout: "Таймаут обробки"
  },
  'ru.json': {
    processing_audio: "Обработка аудио...",
    uploading: "Загрузка...",
    recognizing: "Распознавание...",
    error_audio_processing: "Не удалось обработать аудио",
    error_audio_too_short: "Запись слишком короткая или пустая (говорите 3+ сек)",
    error_voice_not_recognized: "Не удалось распознать голос. Говорите четче или дольше.",
    error_api: "Ошибка API",
    error_timeout: "Таймаут обработки"
  },
  'en.json': {
    processing_audio: "Processing audio...",
    uploading: "Uploading...",
    recognizing: "Recognizing...",
    error_audio_processing: "Failed to process audio",
    error_audio_too_short: "Recording is too short or empty (speak for 3+ sec)",
    error_voice_not_recognized: "Failed to recognize voice. Speak clearer or longer.",
    error_api: "API Error",
    error_timeout: "Processing timeout"
  },
  'pl.json': {
    processing_audio: "Przetwarzanie audio...",
    uploading: "Przesyłanie...",
    recognizing: "Rozpoznawanie...",
    error_audio_processing: "Nie udało się przetworzyć audio",
    error_audio_too_short: "Nagranie jest zbyt krótkie (mów przez 3+ sek)",
    error_voice_not_recognized: "Nie udało się rozpoznać głosu. Mów wyraźniej lub dłużej.",
    error_api: "Błąd API",
    error_timeout: "Przekroczono czas przetwarzania"
  }
};

for (const [filename, newKeys] of Object.entries(data)) {
  const filePath = `src/locales/${filename}`;
  if (fs.existsSync(filePath)) {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!fileData.input) fileData.input = {};
    Object.assign(fileData.input, newKeys);
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    console.log(`Updated ${filePath}`);
  }
}
