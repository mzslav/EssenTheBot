import { useState, useRef, useEffect } from 'react';
import type { InputMode } from '../types/types';

interface InputSectionProps {
  isDark: boolean;
  themeColor: string;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  onSubmit: (mode: InputMode, data: string | Blob | null, text?: string) => void;
  isProcessing: boolean;
}

export const InputSection = ({
  isDark,
  themeColor,
  inputMode,
  setInputMode,
  onSubmit,
  isProcessing
}: InputSectionProps) => {
  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('photo')}
          disabled={isProcessing}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
            inputMode === 'photo'
              ? isDark 
                ? 'bg-white/15 text-white border-2' 
                : 'bg-slate-200 text-slate-900 border-2'
              : isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white/70' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          style={inputMode === 'photo' ? { borderColor: themeColor } : {}}
        >
          📸 Фото
        </button>
        <button
          onClick={() => setInputMode('voice')}
          disabled={isProcessing}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
            inputMode === 'voice'
              ? isDark 
                ? 'bg-white/15 text-white border-2' 
                : 'bg-slate-200 text-slate-900 border-2'
              : isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white/70' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          style={inputMode === 'voice' ? { borderColor: themeColor } : {}}
        >
          🎤 Голос
        </button>
        <button
          onClick={() => setInputMode('text')}
          disabled={isProcessing}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
            inputMode === 'text'
              ? isDark 
                ? 'bg-white/15 text-white border-2' 
                : 'bg-slate-200 text-slate-900 border-2'
              : isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white/70' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          style={inputMode === 'text' ? { borderColor: themeColor } : {}}
        >
          ⌨️ Текст
        </button>
      </div>

      <div 
        className={`rounded-2xl border transition-all overflow-hidden ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'
        }`}
      >
        {inputMode === 'photo' && (
          <PhotoInput 
            isDark={isDark} 
            themeColor={themeColor} 
            onSubmit={onSubmit}
            isProcessing={isProcessing}
          />
        )}
        {inputMode === 'voice' && (
          <VoiceInput 
            isDark={isDark} 
            themeColor={themeColor} 
            onSubmit={onSubmit}
            isProcessing={isProcessing}
          />
        )}
        {inputMode === 'text' && (
          <TextInput 
            isDark={isDark} 
            themeColor={themeColor} 
            onSubmit={onSubmit}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </>
  );
};

interface InputComponentProps {
  isDark: boolean;
  themeColor: string;
  onSubmit: (mode: InputMode, data: string | Blob | null, text?: string) => void;
  isProcessing: boolean;
}

const PhotoInput = ({ isDark, themeColor, onSubmit, isProcessing }: InputComponentProps) => {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoText, setPhotoText] = useState('');
  const [photoSource, setPhotoSource] = useState<'none' | 'camera' | 'gallery'>('none');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photoSource === 'camera' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [photoSource, capturedPhoto]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Помилка доступу до камери:', error);
      alert('Не вдалося отримати доступ до камери');
      setPhotoSource('none');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoUrl = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(photoUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setPhotoText('');
    setPhotoSource('none');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPhoto(event.target?.result as string);
        setPhotoSource('gallery'); 
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!capturedPhoto) return;
    onSubmit('photo', capturedPhoto, photoText);
  };

  if (photoSource === 'none') {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">📸</div>
          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Обери джерело фото
          </h3>
          <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Зроби фото або завантаж з галереї
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setPhotoSource('camera')}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}
          >
            📷 Зробити фото
          </button>
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}
          >
            🖼️ Вибрати з галереї
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full h-64 bg-black rounded-t-2xl overflow-hidden">
        {!capturedPhoto ? (
          photoSource === 'camera' ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                onClick={capturePhoto}
                disabled={isProcessing}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-white/30 transition-all active:scale-90 disabled:opacity-50"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-3">🖼️</div>
                <p className="text-white/70 text-sm">Завантаження фото...</p>
              </div>
            </div>
          )
        ) : (
          <>
            <img 
              src={capturedPhoto} 
              alt="Captured" 
              className="w-full h-full object-cover"
            />
            <button
              onClick={retakePhoto}
              disabled={isProcessing}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-semibold disabled:opacity-50"
            >
              Змінити фото
            </button>
          </>
        )}
      </div>

      <div className="p-4 space-y-3">
        <input
          type="text"
          value={photoText}
          onChange={(e) => setPhotoText(e.target.value)}
          placeholder="Додай опис (опційно)"
          disabled={isProcessing}
          className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
            isDark 
              ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-white/20' 
              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-slate-300'
          }`}
        />
        {capturedPhoto && (
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shadow-lg disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
          >
            {isProcessing ? 'Обробка...' : 'Розпізнати страву'}
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const VoiceInput = ({ isDark, themeColor, onSubmit, isProcessing }: InputComponentProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Помилка запису:', error);
      alert('Не вдалося отримати доступ до мікрофона');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

const handleTranscribe = async (blob: Blob) => {
  setIsTranscribing(true);
  setTranscriptionProgress('Підготовка...');
  
  try {
    const { transcribeAudio } = await import('../utils/assemblyAIService');
    const text = await transcribeAudio(blob, (progress) => {
      setTranscriptionProgress(progress);
    });
    setTranscribedText(text);
  } catch (error: any) {
    console.error('Помилка транскрипції:', error);
    const msg = error.message || 'Невідома помилка';
    setTranscriptionProgress('');
    alert(`Транскрипція не вдалася: ${msg}\nСпробуй говорити чіткіше, 3+ сек, перевір мікрофон.`);
    setTranscribedText('');
  } finally {
    setIsTranscribing(false);
  }
};


  const playAudio = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
      };
      
      audio.play();
      setIsPlayingAudio(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const deleteAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setTranscribedText('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleSubmit = () => {
    onSubmit('voice', transcribedText);
  };

  return (
    <div className="w-full p-6 space-y-4">
      {!audioBlob ? (
        <>
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${
            isRecording 
              ? 'bg-red-500/20 animate-pulse' 
              : isDark ? 'bg-white/10' : 'bg-slate-100'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRecording ? 'text-red-500' : isDark ? 'text-white/50' : 'text-slate-400'}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </div>
          
          {isRecording && (
            <div className="flex gap-1 items-center justify-center h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 20}px`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
          )}
          
          {isRecording && (
            <p className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatTime(recordingTime)}
            </p>
          )}
          
          <p className={`text-xs text-center ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            {isRecording ? 'Запис голосу...' : 'Натисни для запису голосового повідомлення'}
          </p>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shadow-lg disabled:opacity-50 ${
              isRecording ? 'bg-red-500' : ''
            }`}
            style={!isRecording ? { background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` } : {}}
          >
            {isRecording ? 'Зупинити запис' : 'Почати запис'}
          </button>
        </>
      ) : (
        <>
          <div className={`rounded-xl p-3 flex items-center gap-3 ${
            isDark ? 'bg-white/5' : 'bg-slate-50'
          }`}>
            <button
              onClick={isPlayingAudio ? pauseAudio : playAudio}
              disabled={isProcessing || isTranscribing}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: themeColor }}
            >
              {isPlayingAudio ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>
            
            <div className="flex-1">
              <div className={`h-8 flex items-center gap-0.5 ${isPlayingAudio ? 'opacity-100' : 'opacity-50'}`}>
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{ 
                      backgroundColor: themeColor,
                      height: `${20 + Math.random() * 20}px`,
                      opacity: isPlayingAudio ? 0.8 : 0.3
                    }}
                  />
                ))}
              </div>
            </div>
            
            <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              {formatTime(recordingTime)}
            </span>
            
            <button
              onClick={deleteAudio}
              disabled={isProcessing || isTranscribing}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>

          {isTranscribing && (
            <div className={`rounded-xl p-3 flex items-center gap-3 ${
              isDark ? 'bg-white/5' : 'bg-slate-50'
            }`}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeColor, borderTopColor: 'transparent' }}></div>
              <p className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                {transcriptionProgress}
              </p>
            </div>
          )}

          {!isTranscribing && (
            <>
              <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-xs mb-2 font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  {transcribedText 
                    ? 'Розпізнаний текст (можеш відредагувати):' 
                    : 'Введіть текст вручну:'}
                </p>
                <textarea
                  value={transcribedText}
                  onChange={(e) => setTranscribedText(e.target.value)}
                  placeholder="Наприклад: Курка з рисом 200г"
                  disabled={isProcessing}
                  className={`w-full h-24 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-white/20' 
                      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-slate-300'
                  }`}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isProcessing || !transcribedText.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shadow-lg disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
              >
                {isProcessing ? 'Обробка...' : 'Розпізнати страву'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

const TextInput = ({ isDark, themeColor, onSubmit, isProcessing }: InputComponentProps) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit('text', inputText);
    }
  };

  return (
    <div className="w-full p-4 space-y-3">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Опиши що ти з'їв, наприклад:
Курка з рисом 200г, овочевий салат..."
        disabled={isProcessing}
        className={`w-full h-24 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
          isDark 
            ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-white/20' 
            : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-slate-300'
        }`}
      />
      <button
        onClick={handleSubmit}
        disabled={!inputText.trim() || isProcessing}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all active:scale-95 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
      >
        {isProcessing ? 'Обробка...' : 'Розпізнати страву'}
      </button>
      <p className={`text-[9px] text-center ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
        AI розпізнає страву та порахує калорії автоматично
      </p>
    </div>
  );
};