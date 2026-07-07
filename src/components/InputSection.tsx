import { useState, useRef, useEffect } from 'react';
import type { InputMode } from '../types/types';
import { Camera, Mic, Type, Image as ImageIcon, Play, Pause, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('photo')}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
            inputMode === 'photo'
              ? isDark 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                : 'bg-zinc-100 text-zinc-900 shadow-sm'
              : isDark 
                ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500' 
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border border-zinc-100'
          }`}
          style={inputMode === 'photo' ? { color: themeColor } : {}}
        >
          <Camera size={14} /> {t('input.photo')}
        </button>
        <button
          onClick={() => setInputMode('voice')}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
            inputMode === 'voice'
              ? isDark 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                : 'bg-zinc-100 text-zinc-900 shadow-sm'
              : isDark 
                ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500' 
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border border-zinc-100'
          }`}
          style={inputMode === 'voice' ? { color: themeColor } : {}}
        >
          <Mic size={14} /> {t('input.voice')}
        </button>
        <button
          onClick={() => setInputMode('text')}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
            inputMode === 'text'
              ? isDark 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                : 'bg-zinc-100 text-zinc-900 shadow-sm'
              : isDark 
                ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500' 
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border border-zinc-100'
          }`}
          style={inputMode === 'text' ? { color: themeColor } : {}}
        >
          <Type size={14} /> {t('input.text')}
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
  const { t } = useTranslation();
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
      alert(t('input.camera_error'));
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
    retakePhoto();
  };

  if (photoSource === 'none') {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
            <Camera size={28} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          </div>
          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {t('input.choose_photo_source')}
          </h3>
          <p className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {t('input.take_or_upload')}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setPhotoSource('camera')}
            disabled={isProcessing}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
          >
            <Camera size={16} /> {t('input.take_photo')}
          </button>
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            disabled={isProcessing}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
          >
            <ImageIcon size={16} /> {t('input.choose_from_gallery')}
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
              <div className="text-center flex flex-col items-center">
                <ImageIcon size={40} className="mb-3 text-zinc-500 opacity-50" />
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">{t('input.loading')}</p>
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
              {t('input.change_photo')}
            </button>
          </>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={photoText}
            onChange={(e) => setPhotoText(e.target.value)}
            placeholder={t('input.add_description')}
            disabled={isProcessing}
            className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50 pr-10 ${
              isDark 
                ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-white/20' 
                : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-slate-300'
            }`}
          />
          {photoText && !isProcessing && (
            <button
              onClick={() => setPhotoText('')}
              className={`absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded-full transition-colors ${
                isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {capturedPhoto && (
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shadow-lg disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
          >
            {isProcessing ? t('input.processing') : t('input.recognize_meal')}
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const VoiceInput = ({ isDark, themeColor, onSubmit, isProcessing }: InputComponentProps) => {
  const { t, i18n } = useTranslation();
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
      alert(t('input.mic_error'));
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
  setTranscriptionProgress(t('input.preparing'));
  
  try {
    const { transcribeAudio } = await import('../utils/assemblyAIService');
    const text = await transcribeAudio(blob, i18n.language, (progressKey) => {
      setTranscriptionProgress(t(`input.${progressKey}`));
    });
    setTranscribedText(text);
  } catch (error: any) {
    console.error('Помилка транскрипції:', error);
    const isKnownError = typeof error.message === 'string' && error.message.startsWith('error_');
    const msg = isKnownError ? t(`input.${error.message}`) : (error.message || t('fridge.unknown_error'));
    setTranscriptionProgress('');
    alert(t('input.transcription_error', { msg }));
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
    deleteAudio();
  };

  return (
    <div className="w-full p-6 space-y-4">
      {!audioBlob ? (
        <>
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all shadow-sm ${
            isRecording 
              ? 'bg-red-500/20 text-red-500 animate-pulse' 
              : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
          }`}>
            <Mic size={32} />
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
            {isRecording ? t('input.recording') : t('input.tap_to_record')}
          </p>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shadow-lg disabled:opacity-50 ${
              isRecording ? 'bg-red-500' : ''
            }`}
            style={!isRecording ? { background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` } : {}}
          >
            {isRecording ? t('input.stop_recording') : t('input.start_recording')}
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
                <Pause size={18} fill="white" className="text-white" />
              ) : (
                <Play size={18} fill="white" className="text-white ml-1" />
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
              <Trash2 size={16} className="text-red-500" />
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
                    ? t('input.recognized_text') 
                    : t('input.enter_text')}
                </p>
                <textarea
                  value={transcribedText}
                  onChange={(e) => setTranscribedText(e.target.value)}
                  placeholder={t('input.placeholder_voice')}
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
                {isProcessing ? t('input.processing') : t('input.recognize_meal')}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

const TextInput = ({ isDark, themeColor, onSubmit, isProcessing }: InputComponentProps) => {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit('text', inputText);
      setInputText('');
    }
  };

  return (
    <div className="w-full p-4 space-y-3">
      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('input.placeholder_text')}
          disabled={isProcessing}
          className={`w-full h-24 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 transition-all disabled:opacity-50 pr-10 ${
            isDark 
              ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-white/20' 
              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-slate-300'
          }`}
        />
        {inputText && !isProcessing && (
          <button
            onClick={() => setInputText('')}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!inputText.trim() || isProcessing}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all active:scale-95 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
      >
        {isProcessing ? t('input.processing') : t('input.recognize_meal')}
      </button>
      <p className={`text-[9px] text-center ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
        {t('input.ai_hint')}
      </p>
    </div>
  );
};