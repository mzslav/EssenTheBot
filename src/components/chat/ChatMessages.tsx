import { Bot, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { MemorySuggestionCard } from './MemorySuggestionCard';
import type { ChatMessage } from './types';

type ChatMessagesProps = {
  messages: ChatMessage[];
  isSending: boolean;
  isDark: boolean;
  themeColor: string;
  quickPrompts: string[];
  onQuickPrompt: (prompt: string) => void;
  onSaveSuggestion: (messageId: string) => void;
};

function renderHighlightedText(content: string, highlights: string[], themeColor: string, isDark: boolean) {
  const validHighlights = highlights
    .filter((highlight) => highlight && content.includes(highlight))
    .sort((a, b) => b.length - a.length);

  if (!validHighlights.length) return content;

  const pattern = new RegExp(
    `(${validHighlights.map((highlight) => highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g'
  );

  return content.split(pattern).map((part, index) =>
    validHighlights.includes(part) ? (
      <mark
        key={`${index}-${part}`}
        className="rounded px-0.5 font-semibold"
        style={{ backgroundColor: `${themeColor}${isDark ? '38' : '24'}`, color: 'inherit' }}
      >
        {part}
      </mark>
    ) : part
  );
}

export function ChatMessages({
  messages,
  isSending,
  isDark,
  themeColor,
  quickPrompts,
  onQuickPrompt,
  onSaveSuggestion,
}: ChatMessagesProps) {
  const { t } = useTranslation();

  if (!messages.length && !isSending) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center px-5 py-10 text-center">
        <div
          className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem]"
          style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
        >
          <div className="absolute inset-0 rounded-[1.4rem] blur-xl" style={{ backgroundColor: `${themeColor}26` }} />
          <Sparkles className="relative" size={26} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {t('chat.empty_title')}
        </h2>
        <p className={`mt-2 max-w-xs text-sm leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {t('chat.empty_subtitle')}
        </p>
        <div className="mt-6 flex max-w-sm flex-wrap justify-center gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onQuickPrompt(prompt)}
              className={`min-h-11 max-w-full break-words rounded-2xl border px-3.5 py-2 text-xs font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 ${
                isDark
                  ? 'border-white/7 bg-zinc-900/70 text-zinc-300'
                  : 'border-zinc-200 bg-white text-zinc-700 shadow-sm'
              }`}
              style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 px-3 py-5"
      role="log"
      aria-live="polite"
      aria-label={t('chat.conversation_label')}
    >
      {messages.map((message) => {
        const isAssistant = message.role === 'assistant';

        return (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${isAssistant ? 'justify-start' : 'justify-end'}`}
          >
            {isAssistant && (
              <div
                className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
                aria-hidden="true"
              >
                <Bot size={15} />
              </div>
            )}
            <div
              className={`max-w-[84%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                isAssistant
                  ? isDark
                    ? 'rounded-bl-md border border-white/5 bg-zinc-900 text-zinc-100'
                    : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-900'
                  : 'rounded-br-md text-white'
              }`}
              style={isAssistant ? undefined : { backgroundColor: themeColor }}
            >
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt={t('chat.attached_image')}
                  className="mb-2 max-h-60 w-full rounded-2xl object-cover"
                />
              )}
              <div className="whitespace-pre-wrap break-words">
                {isAssistant
                  ? renderHighlightedText(message.content, message.highlights ?? [], themeColor, isDark)
                  : message.content}
              </div>
              {isAssistant && message.memorySuggestion && (
                <MemorySuggestionCard
                  suggestion={message.memorySuggestion}
                  isDark={isDark}
                  themeColor={themeColor}
                  onSave={() => onSaveSuggestion(message.id)}
                />
              )}
            </div>
          </div>
        );
      })}

      {isSending && (
        <div className="flex items-end gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
          >
            <Bot size={15} className="shrink-0" />
          </div>
          <div className={`flex h-11 items-center gap-1.5 rounded-[1.35rem] rounded-bl-md border px-4 ${
            isDark ? 'border-white/5 bg-zinc-900' : 'border-zinc-200 bg-white'
          }`} aria-label={t('chat.thinking')}>
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1.5 w-1.5 shrink-0 animate-bounce rounded-full"
                style={{ backgroundColor: themeColor, animationDelay: `${dot * 120}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
