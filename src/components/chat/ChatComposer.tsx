import { useEffect, useRef } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { SelectedImage } from './types';

type ChatComposerProps = {
  input: string;
  selectedImage: SelectedImage | null;
  isSending: boolean;
  isSyncing: boolean;
  isDark: boolean;
  themeColor: string;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function ChatComposer({
  input,
  selectedImage,
  isSending,
  isSyncing,
  isDark,
  themeColor,
  imageInputRef,
  onInputChange,
  onImageSelect,
  onRemoveImage,
  onSubmit,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const isDisabled = (!input.trim() && !selectedImage) || isSending || isSyncing;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
  }, [input]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 w-full"
    >
      {selectedImage && (
        <div className={`mb-2 flex items-center gap-3 rounded-2xl border p-2 ${
          isDark ? 'border-white/7 bg-zinc-900' : 'border-zinc-200 bg-white shadow-sm'
        }`}>
          <img src={selectedImage.dataUrl} alt={t('chat.attached_image')} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{t('chat.image_ready')}</p>
            <p className={`mt-0.5 line-clamp-2 text-[10px] leading-snug ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {t('chat.image_not_saved')}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemoveImage}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 ${
              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
            }`}
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            aria-label={t('chat.image_remove')}
          >
            <X size={17} className="shrink-0" />
          </button>
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-[1.8rem] border p-2 w-full ${
        isDark
          ? 'border-white/10 bg-zinc-900/90 shadow-2xl shadow-black/20'
          : 'border-zinc-200 bg-white shadow-xl shadow-zinc-300/30'
      } backdrop-blur-xl`}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={isSending}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40 ${
            isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
          }`}
          style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
          aria-label={t('chat.attach_image')}
        >
          <ImagePlus size={19} className="shrink-0" />
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.input_placeholder')}
          rows={1}
          className={`block max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-[10px] text-sm leading-6 outline-none ${
            isDark ? 'text-zinc-100 placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'
          }`}
          aria-label={t('chat.message_input_label')}
        />
        <button
          type="submit"
          disabled={isDisabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: themeColor, '--tw-ring-color': themeColor } as React.CSSProperties}
          aria-label={t('chat.send_message')}
        >
          <Send size={18} className="shrink-0" />
        </button>
      </div>
    </form>
  );
}
