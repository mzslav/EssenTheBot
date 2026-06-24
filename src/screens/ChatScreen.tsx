import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatMessages } from '../components/chat/ChatMessages';
import { HelpSheet } from '../components/chat/HelpSheet';
import { KnowledgeSheet } from '../components/chat/KnowledgeSheet';
import type { ChatMessage, SelectedImage, SyncStatus } from '../components/chat/types';
import { Toast } from '../components/Toast';
import { useToast } from '../components/useToast';
import type { TelegramUser } from '../types/types';
import {
  deleteManualKnowledge,
  ingestManualKnowledge,
  listManualKnowledge,
  RagServiceError,
  sendChatMessage,
  syncKnowledge,
  updateManualKnowledge,
  type ManualKnowledgeNote,
  type RagChatHistoryMessage,
} from '../utils/ragService';

type ChatScreenProps = {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
};

type ManualNotesStatus = 'idle' | 'loading' | 'ready' | 'error';
type ManualNotesListResponse = { ok: boolean; notes: ManualKnowledgeNote[] };

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const manualNotesCache = new Map<number, ManualKnowledgeNote[]>();
const manualNotesRequests = new Map<number, Promise<ManualNotesListResponse>>();
const SYNC_CLIENT_COOLDOWN_MS = 90_000;

type SyncCache = {
  lastSuccessfulAt?: string;
  nextAllowedAt?: string;
};

function getSyncStorageKey(userId: number) {
  return `rag-sync:${userId}`;
}

function readSyncCache(userId: number): SyncCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getSyncStorageKey(userId));
    return raw ? JSON.parse(raw) as SyncCache : null;
  } catch {
    return null;
  }
}

function writeSyncCache(userId: number, cache: SyncCache) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getSyncStorageKey(userId), JSON.stringify(cache));
  } catch {
  }
}

function isFutureIsoString(value?: string) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function isExplicitSaveIntent(text: string) {
  const normalized = text.trim().toLowerCase();
  return Boolean(normalized && /(запиши|збережи|сохрани|запомни|save|remember|store)/iu.test(normalized));
}

function resizeImage(file: File): Promise<SelectedImage> {
  return new Promise((resolve, reject) => {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      reject(new Error('unsupported_image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('image_read_failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image_read_failed'));
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('image_read_failed'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve({
          dataUrl: canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.82 : undefined),
          mimeType,
        });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ChatScreen = ({ user, isDark, themeColor = '#8b5cf6' }: ChatScreenProps) => {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { toast, showToast, hideToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualNotes, setManualNotes] = useState<ManualKnowledgeNote[]>([]);
  const [isManualKnowledgeOpen, setIsManualKnowledgeOpen] = useState(false);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [editingManualNoteId, setEditingManualNoteId] = useState<string | null>(null);
  const [confirmingManualNoteId, setConfirmingManualNoteId] = useState<string | null>(null);
  const [deletingManualNoteId, setDeletingManualNoteId] = useState<string | null>(null);
  const [manualNotesStatus, setManualNotesStatus] = useState<ManualNotesStatus>('idle');
  const [manualNotesError, setManualNotesError] = useState<string | null>(null);
  const [isSavingManualKnowledge, setIsSavingManualKnowledge] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const latestManualLoadIdRef = useRef(0);
  const syncRequestRef = useRef<Promise<boolean> | null>(null);
  const userId = user?.id;
  const isLoadingManualNotes = manualNotesStatus === 'loading';

  const getErrorMessage = useCallback((caughtError: unknown, fallbackKey: string) => {
    if (caughtError instanceof RagServiceError) {
      return t(`chat.error_${caughtError.code}`);
    }
    return t(fallbackKey);
  }, [t]);

  const loadManualNotes = useCallback(async (targetUser: TelegramUser, options?: { force?: boolean }) => {
    const targetUserId = targetUser.id;
    const loadId = ++latestManualLoadIdRef.current;

    if (!options?.force) {
      const cachedNotes = manualNotesCache.get(targetUserId);
      if (cachedNotes) {
        setManualNotes(cachedNotes);
        setManualNotesStatus('ready');
        setManualNotesError(null);
        return cachedNotes;
      }
    }

    setManualNotesStatus('loading');
    setManualNotesError(null);

    let request = manualNotesRequests.get(targetUserId);
    if (!request || options?.force) {
      request = listManualKnowledge(targetUser);
      manualNotesRequests.set(targetUserId, request);
      void request.finally(() => {
        if (manualNotesRequests.get(targetUserId) === request) {
          manualNotesRequests.delete(targetUserId);
        }
      });
    }

    try {
      const response = await request;
      if (latestManualLoadIdRef.current !== loadId) {
        return response.notes;
      }

      manualNotesCache.set(targetUserId, response.notes);
      setManualNotes(response.notes);
      setManualNotesStatus('ready');
      setManualNotesError(null);
      return response.notes;
    } catch (loadError) {
      if (latestManualLoadIdRef.current !== loadId) {
        return [];
      }

      const message = getErrorMessage(loadError, 'chat.manual_list_error');
      setManualNotesStatus('error');
      setManualNotesError(message);
      showToast(message, 'error');
      return [];
    }
  }, [getErrorMessage, showToast]);

  const syncKnowledgeContext = useCallback(async (
    targetUser: TelegramUser,
    options?: { force?: boolean; silent?: boolean }
  ) => {
    if (!targetUser.id) {
      setSyncStatus('idle');
      return false;
    }

    const cached = readSyncCache(targetUser.id);
    if (!options?.force && isFutureIsoString(cached?.nextAllowedAt)) {
      setSyncStatus(cached?.lastSuccessfulAt ? 'ready' : 'idle');
      return false;
    }

    if (syncRequestRef.current) {
      return syncRequestRef.current;
    }

    setSyncStatus('syncing');

    const request = (async () => {
      try {
        const response = await syncKnowledge(targetUser);
        const syncedAt = response.syncedAt || new Date().toISOString();
        const nextAllowedAt = new Date(Date.now() + SYNC_CLIENT_COOLDOWN_MS).toISOString();

        writeSyncCache(targetUser.id, {
          lastSuccessfulAt: syncedAt,
          nextAllowedAt,
        });
        setSyncStatus('ready');
        return true;
      } catch (syncError) {
        if (syncError instanceof RagServiceError && syncError.code === 'rate_limited') {
          const nextAllowedAt = syncError.resetAt;
          if (nextAllowedAt) {
            writeSyncCache(targetUser.id, {
              ...(cached ?? {}),
              nextAllowedAt,
            });
          }

          if (cached?.lastSuccessfulAt) {
            setSyncStatus('ready');
            return false;
          }
        }

        setSyncStatus('error');
        if (!options?.silent) {
          showToast(getErrorMessage(syncError, 'chat.sync_error'), 'error');
        }
        return false;
      } finally {
        syncRequestRef.current = null;
      }
    })();

    syncRequestRef.current = request;
    return request;
  }, [getErrorMessage, showToast]);

  useEffect(() => {
    setManualTitle('');
    setManualContent('');
    setIsManualFormOpen(false);
    setEditingManualNoteId(null);
    setConfirmingManualNoteId(null);
    setDeletingManualNoteId(null);

    if (!userId || !user) {
      latestManualLoadIdRef.current += 1;
      setManualNotes([]);
      setManualNotesStatus('idle');
      setManualNotesError(null);
      setSyncStatus('idle');
      return;
    }

    const cachedNotes = manualNotesCache.get(userId);
    if (cachedNotes) {
      setManualNotes(cachedNotes);
      setManualNotesStatus('ready');
      setManualNotesError(null);
      return;
    }

    void loadManualNotes(user);
  }, [userId, user, loadManualNotes]);

  useEffect(() => {
    if (!userId || !user) {
      setSyncStatus('idle');
      return;
    }

    const cached = readSyncCache(userId);
    if (isFutureIsoString(cached?.nextAllowedAt)) {
      setSyncStatus(cached?.lastSuccessfulAt ? 'ready' : 'idle');
      return;
    }

    setSyncStatus('idle');
    void syncKnowledgeContext(user, { silent: true });
  }, [userId, user, syncKnowledgeContext]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsHowItWorksOpen(false);
      setIsManualKnowledgeOpen(false);
      setConfirmingManualNoteId(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'end',
      });
    });
  }, [messages.length, isSending, error, reduceMotion]);

  function resetManualForm() {
    setManualTitle('');
    setManualContent('');
    setEditingManualNoteId(null);
    setIsManualFormOpen(false);
  }

  function startManualCreate() {
    setEditingManualNoteId(null);
    setManualTitle('');
    setManualContent('');
    setIsManualFormOpen(true);
    setConfirmingManualNoteId(null);
  }

  function buildSessionHistory(nextUserMessage: string): RagChatHistoryMessage[] {
    return [
      ...messages,
      { id: 'pending-user', role: 'user' as const, content: nextUserMessage },
    ]
      .map((message) => ({ role: message.role, content: message.content.trim() }))
      .filter((message) => message.content.length > 0);
  }

  function getLatestPendingMemorySuggestion() {
    for (const message of [...messages].reverse()) {
      if (message.role === 'assistant' && message.memorySuggestion?.state !== 'saved' && message.memorySuggestion) {
        return { messageId: message.id, suggestion: message.memorySuggestion };
      }
    }
    return null;
  }

  async function refreshManualKnowledge() {
    if (!user) return;
    await loadManualNotes(user, { force: true });
  }

  const handleManualKnowledgeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = manualTitle.trim();
    const trimmedContent = manualContent.trim();

    if (!user?.id || isSavingManualKnowledge) return;
    if (!trimmedTitle) {
      showToast(t('chat.manual_title_required'), 'error');
      return;
    }
    if (!trimmedContent) {
      showToast(t('chat.manual_content_required'), 'error');
      return;
    }

    setIsSavingManualKnowledge(true);
    const wasEditing = Boolean(editingManualNoteId);

    try {
      if (editingManualNoteId) {
        await updateManualKnowledge(user, {
          documentId: editingManualNoteId,
          title: trimmedTitle,
          content: trimmedContent,
        });
      } else {
        await ingestManualKnowledge(user, { title: trimmedTitle, content: trimmedContent });
      }
      await refreshManualKnowledge();
      resetManualForm();
      showToast(t(wasEditing ? 'chat.manual_update_success' : 'chat.manual_success'));
    } catch (saveError) {
      showToast(getErrorMessage(saveError, 'chat.manual_save_error'), 'error');
    } finally {
      setIsSavingManualKnowledge(false);
    }
  };

  const handleManualKnowledgeEdit = (note: ManualKnowledgeNote) => {
    setEditingManualNoteId(note.id);
    setManualTitle(note.title);
    setManualContent(note.content);
    setIsManualFormOpen(true);
    setConfirmingManualNoteId(null);
  };

  const handleManualKnowledgeDelete = async (documentId: string) => {
    if (!user?.id || deletingManualNoteId) return;
    setDeletingManualNoteId(documentId);

    try {
      await deleteManualKnowledge(user, documentId);
      await refreshManualKnowledge();
      if (editingManualNoteId === documentId) resetManualForm();
      setConfirmingManualNoteId(null);
      showToast(t('chat.manual_delete_success'));
    } catch (deleteError) {
      showToast(getErrorMessage(deleteError, 'chat.manual_delete_error'), 'error');
    } finally {
      setDeletingManualNoteId(null);
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);

    try {
      setSelectedImage(await resizeImage(file));
    } catch (imageError) {
      setError(
        imageError instanceof Error && imageError.message === 'unsupported_image'
          ? t('chat.image_unsupported')
          : t('chat.image_error')
      );
    }
  };

  const sendMessage = async (value: string) => {
    const trimmedInput = value.trim();
    if ((!trimmedInput && !selectedImage) || !user?.id || isSending) return;

    const sentImage = selectedImage;
    const displayContent = trimmedInput || t('chat.image_default_question');
    const latestPendingSuggestion = !sentImage && isExplicitSaveIntent(displayContent)
      ? getLatestPendingMemorySuggestion()
      : null;
    const history = buildSessionHistory(displayContent);

    setMessages((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: displayContent,
        imageUrl: sentImage?.dataUrl,
      },
    ]);
    setInput('');
    setSelectedImage(null);
    setIsSending(true);
    setError(null);

    try {
      await syncKnowledgeContext(user, { silent: true });

      if (latestPendingSuggestion) {
        await ingestManualKnowledge(user, {
          title: latestPendingSuggestion.suggestion.title,
          content: latestPendingSuggestion.suggestion.content,
        });
        await refreshManualKnowledge();
        setMessages((previous) => [
          ...previous.map((message) =>
            message.id === latestPendingSuggestion.messageId && message.memorySuggestion
              ? { ...message, memorySuggestion: { ...message.memorySuggestion, state: 'saved' as const } }
              : message
          ),
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: t('chat.memory_saved_reply'),
          },
        ]);
        showToast(t('chat.memory_suggestion_saved'));
        return;
      }

      const response = await sendChatMessage(user, displayContent, sentImage ?? undefined, history);
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          highlights: response.highlights,
          memorySuggestion: response.memorySuggestion
            ? { ...response.memorySuggestion, state: 'idle' }
            : null,
        },
      ]);
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'chat.message_error'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleSaveSuggestedKnowledge = async (messageId: string) => {
    const targetMessage = messages.find((message) => message.id === messageId);
    const suggestion = targetMessage?.memorySuggestion;
    if (!user?.id || !suggestion || suggestion.state === 'saving' || suggestion.state === 'saved') return;

    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId && message.memorySuggestion
          ? { ...message, memorySuggestion: { ...message.memorySuggestion, state: 'saving' } }
          : message
      )
    );
    setError(null);

    try {
      await ingestManualKnowledge(user, { title: suggestion.title, content: suggestion.content });
      await refreshManualKnowledge();
      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId && message.memorySuggestion
            ? { ...message, memorySuggestion: { ...message.memorySuggestion, state: 'saved' } }
            : message
        )
      );
      showToast(t('chat.memory_suggestion_saved'));
    } catch (saveError) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId && message.memorySuggestion
            ? { ...message, memorySuggestion: { ...message.memorySuggestion, state: 'idle' } }
            : message
        )
      );
      setError(getErrorMessage(saveError, 'chat.memory_suggestion_error'));
    }
  };

  const quickPrompts = [
    t('chat.quick_protein'),
    t('chat.quick_meal_idea'),
    t('chat.quick_progress'),
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md self-start px-2 pb-8 space-y-4"
      >
        <motion.div variants={itemVariants}>
          <section
            className={`overflow-hidden rounded-[1.8rem] border ${isDark
              ? 'border-white/7 bg-zinc-950/65 shadow-2xl shadow-black/20'
              : 'border-zinc-200 bg-zinc-50/80 shadow-xl shadow-zinc-300/30'
              }`}
          >
            <ChatHeader
              isDark={isDark}
              themeColor={themeColor}
              noteCount={manualNotes.length}
              syncStatus={syncStatus}
              onOpenKnowledge={() => setIsManualKnowledgeOpen(true)}
              onOpenHelp={() => setIsHowItWorksOpen(true)}
            />
          </section>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants}>
            <div
              className={`flex items-start gap-3 rounded-2xl border p-3 ${isDark ? 'border-red-500/20 bg-red-950/35 text-red-200' : 'border-red-200 bg-red-50 text-red-800'
                }`}
              role="alert"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1 break-words text-xs font-medium leading-relaxed">{error}</p>
              <button type="button" onClick={() => setError(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" aria-label={t('chat.dismiss_error')}>
                <X size={15} className="shrink-0" />
              </button>
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <section
            className={`overflow-hidden rounded-[1.8rem] border ${isDark
              ? 'border-white/7 bg-zinc-950/65 shadow-2xl shadow-black/20'
              : 'border-zinc-200 bg-zinc-50/80 shadow-xl shadow-zinc-300/30'
              }`}
          >
            <ChatMessages
              messages={messages}
              isSending={isSending}
              isDark={isDark}
              themeColor={themeColor}
              quickPrompts={quickPrompts}
              onQuickPrompt={(prompt) => void sendMessage(prompt)}
              onSaveSuggestion={(messageId) => void handleSaveSuggestedKnowledge(messageId)}
            />
            <div ref={scrollAnchorRef} />
          </section>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full">
          <ChatComposer
            input={input}
            selectedImage={selectedImage}
            isSending={isSending}
            isSyncing={syncStatus === 'syncing'}
            isDark={isDark}
            themeColor={themeColor}
            imageInputRef={imageInputRef}
            onInputChange={setInput}
            onImageSelect={handleImageSelect}
            onRemoveImage={() => setSelectedImage(null)}
            onSubmit={handleSubmit}
          />
        </motion.div>
      </motion.div>

      <KnowledgeSheet
        isOpen={isManualKnowledgeOpen}
        isDark={isDark}
        themeColor={themeColor}
        notes={manualNotes}
        isLoading={isLoadingManualNotes}
        isFormOpen={isManualFormOpen}
        isSaving={isSavingManualKnowledge}
        editingNoteId={editingManualNoteId}
        confirmingNoteId={confirmingManualNoteId}
        deletingNoteId={deletingManualNoteId}
        title={manualTitle}
        content={manualContent}
        locale={i18n.resolvedLanguage || i18n.language}
        errorMessage={manualNotesError}
        onClose={() => {
          setIsManualKnowledgeOpen(false);
          setConfirmingManualNoteId(null);
        }}
        onStartCreate={startManualCreate}
        onEdit={handleManualKnowledgeEdit}
        onRequestDelete={setConfirmingManualNoteId}
        onDelete={(noteId) => void handleManualKnowledgeDelete(noteId)}
        onCancelForm={resetManualForm}
        onTitleChange={setManualTitle}
        onContentChange={setManualContent}
        onSubmit={handleManualKnowledgeSubmit}
        onRetry={user ? () => void loadManualNotes(user, { force: true }) : undefined}
      />

      <HelpSheet
        isOpen={isHowItWorksOpen}
        isDark={isDark}
        themeColor={themeColor}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </>
  );
};
