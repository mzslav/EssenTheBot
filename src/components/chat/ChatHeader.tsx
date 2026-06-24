import { Bot, Brain, CircleHelp } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import type { SyncStatus } from './types';

type ChatHeaderProps = {
  isDark: boolean;
  themeColor: string;
  noteCount: number;
  syncStatus: SyncStatus;
  onOpenKnowledge: () => void;
  onOpenHelp: () => void;
};

export function ChatHeader({
  isDark,
  themeColor,
  noteCount,
  syncStatus,
  onOpenKnowledge,
  onOpenHelp,
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const statusColor = syncStatus === 'ready'
    ? '#10b981'
    : syncStatus === 'error'
      ? '#ef4444'
      : syncStatus === 'syncing'
        ? '#f59e0b'
        : '#71717a';

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative z-10 flex items-center gap-2.5 border-b px-4 py-3 ${
        isDark ? 'border-white/5 bg-zinc-950/85' : 'border-zinc-200/70 bg-zinc-50/90'
      } backdrop-blur-xl`}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm"
        style={{ backgroundColor: `${themeColor}1f`, color: themeColor }}
      >
        <Bot size={21} strokeWidth={2.2} className="shrink-0" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className={`truncate text-base font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-950'}`}>
          {t('chat.title')}
        </h1>
        <div className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
          <span className="relative flex h-2 w-2 shrink-0">
            {syncStatus === 'syncing' && (
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: statusColor }}
              />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
          </span>
          <span className="truncate">{t(`chat.status_${syncStatus}`)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenKnowledge}
        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 ${
          isDark
            ? 'border-white/5 bg-zinc-900 text-zinc-300'
            : 'border-zinc-200 bg-white text-zinc-700 shadow-sm'
        }`}
        style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
        aria-label={t('chat.open_memory')}
      >
        <Brain size={17} className="shrink-0" style={{ color: themeColor }} />
        <span className="truncate">{noteCount}</span>
      </button>

      <button
        type="button"
        onClick={onOpenHelp}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 ${
          isDark
            ? 'border-white/5 bg-zinc-900 text-zinc-400'
            : 'border-zinc-200 bg-white text-zinc-600 shadow-sm'
        }`}
        style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
        aria-label={t('chat.open_help')}
      >
        <CircleHelp size={18} className="shrink-0" />
      </button>
    </motion.header>
  );
}
