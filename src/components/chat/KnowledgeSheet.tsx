import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Brain, LoaderCircle, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ManualKnowledgeNote } from '../../utils/ragService';

type KnowledgeSheetProps = {
  isOpen: boolean;
  isDark: boolean;
  themeColor: string;
  notes: ManualKnowledgeNote[];
  isLoading: boolean;
  errorMessage?: string | null;
  isFormOpen: boolean;
  isSaving: boolean;
  editingNoteId: string | null;
  confirmingNoteId: string | null;
  deletingNoteId: string | null;
  title: string;
  content: string;
  locale: string;
  onClose: () => void;
  onStartCreate: () => void;
  onEdit: (note: ManualKnowledgeNote) => void;
  onRequestDelete: (noteId: string | null) => void;
  onDelete: (noteId: string) => void;
  onCancelForm: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onRetry?: () => void;
};

export function KnowledgeSheet({
  isOpen,
  isDark,
  themeColor,
  notes,
  isLoading,
  errorMessage,
  isFormOpen,
  isSaving,
  editingNoteId,
  confirmingNoteId,
  deletingNoteId,
  title,
  content,
  locale,
  onClose,
  onStartCreate,
  onEdit,
  onRequestDelete,
  onDelete,
  onCancelForm,
  onTitleChange,
  onContentChange,
  onSubmit,
  onRetry,
}: KnowledgeSheetProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
    isDark
      ? 'border-white/10 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600'
      : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400'
  }`;

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="knowledge-title">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label={t('chat.close_memory')}
          />
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={`relative flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border-t ${
              isDark ? 'border-white/10 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
            }`}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-500/30" />
            <header className={`flex items-center gap-2.5 border-b px-4 py-3 ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${themeColor}18`, color: themeColor }}>
                <Brain size={19} className="shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="knowledge-title" className="truncate text-base font-black tracking-tight">{t('chat.memory_title')}</h2>
                <p className={`truncate text-[11px] font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {t('chat.memory_count', { count: notes.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={onStartCreate}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-xs font-bold text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2"
                style={{ backgroundColor: themeColor, '--tw-ring-color': themeColor } as React.CSSProperties}
              >
                <Plus size={16} className="shrink-0" />
                <span className="max-w-[90px] truncate sm:max-w-none">{t('chat.manual_open')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 ${
                  isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-600 shadow-sm'
                }`}
                style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                aria-label={t('chat.close_memory')}
              >
                <X size={18} className="shrink-0" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence initial={false}>
                {isFormOpen && (
                  <motion.form
                    onSubmit={onSubmit}
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`mb-4 space-y-3 rounded-3xl border p-4 ${
                      isDark ? 'border-white/7 bg-zinc-900/70' : 'border-zinc-200 bg-white shadow-sm'
                    }`}>
                      <div>
                        <p className="text-sm font-black">
                          {editingNoteId ? t('chat.manual_edit_title') : t('chat.manual_title')}
                        </p>
                        <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {editingNoteId ? t('chat.manual_editing_hint') : t('chat.manual_subtitle')}
                        </p>
                      </div>
                      <input
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        placeholder={t('chat.manual_title_placeholder')}
                        className={inputClass}
                        style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                        aria-label={t('chat.manual_title_label')}
                      />
                      <textarea
                        value={content}
                        onChange={(event) => onContentChange(event.target.value)}
                        placeholder={t('chat.manual_content_placeholder')}
                        rows={5}
                        className={`${inputClass} resize-none`}
                        style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                        aria-label={t('chat.manual_content_label')}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={onCancelForm}
                          className={`min-h-11 flex-1 rounded-2xl px-4 py-2 text-sm font-bold ${
                            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <span className="block truncate">{t('chat.manual_cancel')}</span>
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          style={{ backgroundColor: themeColor }}
                        >
                          {isSaving ? <LoaderCircle size={16} className="shrink-0 animate-spin" /> : <Save size={16} className="shrink-0" />}
                          <span className="truncate">
                            {isSaving
                              ? t('chat.manual_saving')
                              : editingNoteId
                                ? t('chat.manual_update')
                                : t('chat.manual_save')}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {isLoading ? (
                <div className={`flex min-h-48 items-center justify-center gap-2 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  <LoaderCircle size={18} className="shrink-0 animate-spin" />
                  {t('chat.manual_loading')}
                </div>
              ) : errorMessage ? (
                <div className={`rounded-3xl border p-4 ${
                  isDark ? 'border-red-500/20 bg-red-950/30' : 'border-red-200 bg-red-50'
                }`}>
                  <p className={`text-sm font-bold ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                    {errorMessage}
                  </p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 min-h-11 max-w-full truncate rounded-2xl px-4 py-2 text-xs font-bold text-white"
                      style={{ backgroundColor: themeColor }}
                    >
                      {t('chat.retry')}
                    </button>
                  )}
                </div>
              ) : notes.length === 0 ? (
                <div className={`flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed px-8 text-center ${
                  isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-300 bg-white/60'
                }`}>
                  <Brain size={28} className={isDark ? 'text-zinc-600' : 'text-zinc-400'} />
                  <p className="mt-3 text-sm font-black">{t('chat.memory_empty_title')}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    {t('chat.manual_empty')}
                  </p>
                  <button
                    type="button"
                    onClick={onStartCreate}
                    className="mt-4 min-h-11 max-w-full truncate rounded-2xl px-5 py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: themeColor }}
                  >
                    {t('chat.manual_open')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <article key={note.id} className={`rounded-3xl border p-4 ${
                      isDark ? 'border-white/7 bg-zinc-900/70' : 'border-zinc-200 bg-white shadow-sm'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-black">{note.title}</h3>
                          <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {t('chat.manual_updated_at')} {formatDate(note.updatedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEdit(note)}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                          }`}
                          aria-label={t('chat.manual_edit')}
                        >
                          <Pencil size={16} className="shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(note.id)}
                          disabled={deletingNoteId === note.id}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl disabled:opacity-50 ${
                            isDark ? 'bg-red-950/40 text-red-300' : 'bg-red-50 text-red-600'
                          }`}
                          aria-label={t('chat.manual_delete')}
                        >
                          {deletingNoteId === note.id
                            ? <LoaderCircle size={16} className="shrink-0 animate-spin" />
                            : <Trash2 size={16} className="shrink-0" />}
                        </button>
                      </div>
                      <p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>{note.content}</p>

                      <AnimatePresence>
                        {confirmingNoteId === note.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`mt-3 rounded-2xl border p-3 ${
                              isDark ? 'border-red-500/20 bg-red-950/30' : 'border-red-200 bg-red-50'
                            }`}>
                              <p className={`text-xs font-bold ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                                {t('chat.manual_delete_confirm')}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => onRequestDelete(null)}
                                  className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-xs font-bold ${
                                    isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-zinc-700'
                                  }`}
                                >
                                  <span className="block truncate">{t('chat.manual_delete_cancel')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(note.id)}
                                  disabled={deletingNoteId === note.id}
                                  className="min-h-11 flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  <span className="block truncate">
                                    {deletingNoteId === note.id
                                      ? t('chat.manual_deleting')
                                      : t('chat.manual_delete_confirm_action')}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
