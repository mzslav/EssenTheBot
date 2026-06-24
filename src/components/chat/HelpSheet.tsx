import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bot, Brain, Database, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type HelpSheetProps = {
  isOpen: boolean;
  isDark: boolean;
  themeColor: string;
  onClose: () => void;
};

export function HelpSheet({ isOpen, isDark, themeColor, onClose }: HelpSheetProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const items = [
    { icon: Database, title: t('chat.help_context_title'), text: t('chat.help_context_text') },
    { icon: Brain, title: t('chat.help_memory_title'), text: t('chat.help_memory_text') },
    { icon: ShieldCheck, title: t('chat.help_privacy_title'), text: t('chat.help_privacy_text') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label={t('chat.close_help')}
          />
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={`relative max-h-[84dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[2rem] border-t p-5 touch-pan-y [-webkit-overflow-scrolling:touch] ${
              isDark ? 'border-white/10 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
            }`}
          >
            <div className="mx-auto -mt-3 mb-4 h-1 w-10 rounded-full bg-zinc-500/30" />
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${themeColor}18`, color: themeColor }}>
                <Bot size={21} className="shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="help-title" className="text-lg font-black tracking-tight">{t('chat.how_it_works')}</h2>
                <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {t('chat.how_it_works_text')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-600 shadow-sm'
                }`}
                aria-label={t('chat.close_help')}
              >
                <X size={18} className="shrink-0" />
              </button>
            </div>
            <div className="mt-5 space-y-2">
              {items.map(({ icon: Icon, title, text }) => (
                <div key={title} className={`flex gap-3 rounded-2xl border p-3 ${
                  isDark ? 'border-white/5 bg-zinc-900/70' : 'border-zinc-200 bg-white'
                }`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color: themeColor, backgroundColor: `${themeColor}14` }}>
                    <Icon size={17} className="shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black break-words">{title}</p>
                    <p className={`mt-1 text-[11px] leading-relaxed break-words ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
