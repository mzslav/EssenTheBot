import { Brain, Check, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { MemorySuggestion } from './types';

type MemorySuggestionCardProps = {
  suggestion: MemorySuggestion;
  isDark: boolean;
  themeColor: string;
  onSave: () => void;
};

export function MemorySuggestionCard({
  suggestion,
  isDark,
  themeColor,
  onSave,
}: MemorySuggestionCardProps) {
  const { t } = useTranslation();
  const isDisabled = suggestion.state === 'saving' || suggestion.state === 'saved';

  return (
    <div className={`mt-3 overflow-hidden rounded-2xl border ${
      isDark ? 'border-white/7 bg-zinc-950/70' : 'border-zinc-200 bg-white/85'
    }`}>
      <div className="flex items-start gap-2.5 p-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
        >
          <Brain size={15} className="shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {t('chat.memory_suggestion_title')}
          </p>
          <p className={`mt-1 break-words text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {suggestion.title}
          </p>
          <p className={`mt-1 break-words text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {suggestion.content}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={isDisabled}
        className={`flex min-h-11 w-full items-center justify-center gap-2 border-t px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed ${
          isDark ? 'border-white/5' : 'border-zinc-200'
        }`}
        style={{
          color: suggestion.state === 'saved' ? '#10b981' : themeColor,
          '--tw-ring-color': themeColor,
        } as React.CSSProperties}
      >
        {suggestion.state === 'saving' && <LoaderCircle size={15} className="shrink-0 animate-spin" />}
        {suggestion.state === 'saved' && <Check size={15} className="shrink-0" />}
        <span className="truncate">
          {suggestion.state === 'saving'
            ? t('chat.memory_suggestion_saving')
            : suggestion.state === 'saved'
              ? t('chat.memory_suggestion_saved_button')
              : t('chat.memory_suggestion_action')}
        </span>
      </button>
    </div>
  );
}
