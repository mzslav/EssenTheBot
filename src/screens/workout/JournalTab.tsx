import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExerciseFormData, SessionSet, TelegramUser, WorkoutSession, SessionWithExercises } from '../../types/types';
import { JournalTabSkeleton } from '../../components/Skeleton';
import { Toast } from '../../components/Toast';
import { useToast } from '../../components/useToast';
import { useFadeIn } from '../../utils/useFadeIn';
import {
  getSessionsByDate,
  getSessionWithExercises,
  createSessionFromPlan,
  updateSessionStatus,
  upsertSet,
  getPreviousSession,
  getPlans,
  getSessionStatusesByDateRange,
  addExerciseToSession,
  replaceSessionExercise,
  skipSessionExercise,
} from '../../utils/workoutService';
import type { WorkoutPlan } from '../../types/types';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import supabase from '../../supabase/supabase-client';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Play, Check, Dumbbell, CalendarPlus,
  Video, Calendar, Flame, Activity, Plus, Shuffle, SkipForward, TimerReset, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface JournalTabProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

function toDateStr(d: Date): string {
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatDisplayDate(date: Date, locale: string = 'uk'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function getWeekDays(center: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(center, i - 3));
}

const calcVolume = (sets: any[]) =>
  sets.filter((s: any) => s.is_completed).reduce((sum: number, s: any) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

const DEFAULT_SESSION_SETS = 3;

const getWorkoutDotColor = (statuses: WorkoutSession['status'][], themeColor: string) => {
  if (statuses.includes('completed')) return '#10b981';
  if (statuses.includes('in_progress')) return themeColor;
  return null;
};

const openVideo = (url: string) => {
  if (!url) return;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  const finalUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : url;
  if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(finalUrl);
  else window.open(finalUrl, '_blank');
};

interface ActiveWorkoutProps {
  user?: TelegramUser;
  sessionFull: SessionWithExercises;
  sessionMeta: WorkoutSession;
  previousSession: SessionWithExercises | null;
  isDark: boolean;
  themeColor: string;
  restTimerSettings: RestTimerSettings;
  onBack: () => void;
  onFinish: () => void;
  onAddExercise: (data: ExerciseFormData) => Promise<void>;
  onReplaceExercise: (sessionExerciseId: number, data: ExerciseFormData) => Promise<void>;
  onSkipExercise: (sessionExerciseId: number) => Promise<void>;
  onSaveSet: (
    exerciseId: number,
    setNumber: number,
    data: Partial<Pick<SessionSet, 'reps' | 'weight' | 'rir' | 'is_completed'>>
  ) => Promise<void>;
}

type RestTimerSettings = {
  enabled: boolean;
  defaultSeconds: number;
  adjustSeconds: number;
};

type SetDraft = {
  weight: string;
  reps: string;
  rir: string;
};

type PickerMode = 'add' | 'replace';

function toInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function parseOptionalFloat(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const ActiveWorkoutView = ({
  user,
  sessionFull, sessionMeta, previousSession,
  isDark, themeColor, restTimerSettings,
  onBack, onFinish, onAddExercise, onReplaceExercise, onSkipExercise, onSaveSet,
}: ActiveWorkoutProps) => {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, SetDraft>>({});
  const [savingSetKeys, setSavingSetKeys] = useState<Record<string, boolean>>({});
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restDone, setRestDone] = useState(false);
  const exercises = sessionFull.exercises ?? [];
  const currentEx = exercises[activeIdx];
  const prevEx = previousSession?.exercises?.find((e: any) =>
    (currentEx?.exercise_id && e.exercise_id === currentEx.exercise_id) ||
    (!currentEx?.exercise_id && e.plan_exercise_id === currentEx?.plan_exercise_id)
  );

  const totalSets = exercises.reduce((s: number, ex: any) => s + (ex.sets?.length ?? 0), 0);
  const completedSets = exercises.reduce((s: number, ex: any) => s + (ex.sets?.filter((st: any) => st.is_completed).length ?? 0), 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  useEffect(() => {
    const nextDrafts: Record<number, SetDraft> = {};
    for (const exercise of exercises) {
      for (const set of exercise.sets ?? []) {
        nextDrafts[set.id] = {
          weight: toInputValue(set.weight),
          reps: toInputValue(set.reps),
          rir: toInputValue(set.rir),
        };
      }
    }
    setDrafts(nextDrafts);
  }, [sessionMeta.id]);

  useEffect(() => {
    if (!restRunning || restSeconds <= 0) return;
    const id = window.setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(id);
          setRestRunning(false);
          setRestDone(true);
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [restRunning, restSeconds]);

  const startRestTimer = () => {
    if (!restTimerSettings.enabled) return;
    setRestSeconds(Math.max(restTimerSettings.defaultSeconds, 1));
    setRestRunning(true);
    setRestDone(false);
  };

  const getSetKey = (exerciseId: number, setNumber: number) => `${exerciseId}:${setNumber}`;

  const updateDraft = (setId: number, field: keyof SetDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [setId]: {
        ...(prev[setId] ?? { weight: '', reps: '', rir: '' }),
        [field]: value,
      },
    }));
  };

  const persistSet = async (
    exerciseId: number,
    setNumber: number,
    data: Partial<Pick<SessionSet, 'reps' | 'weight' | 'rir' | 'is_completed'>>
  ) => {
    const key = getSetKey(exerciseId, setNumber);
    setSavingSetKeys((prev) => ({ ...prev, [key]: true }));
    try {
      await onSaveSet(exerciseId, setNumber, data);
      return true;
    } finally {
      setSavingSetKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleCommitField = async (
    exerciseId: number,
    setNumber: number,
    setId: number,
    field: keyof Pick<SessionSet, 'weight' | 'reps' | 'rir'>
  ) => {
    const draft = drafts[setId] ?? { weight: '', reps: '', rir: '' };
    const parsedValue = field === 'weight'
      ? parseOptionalFloat(draft.weight)
      : parseOptionalInteger(draft[field]);

    await persistSet(exerciseId, setNumber, { [field]: parsedValue } as Partial<SessionSet>);
  };

  const handleToggleSet = async (exerciseId: number, set: SessionSet) => {
    const draft = drafts[set.id] ?? { weight: '', reps: '', rir: '' };
    await persistSet(exerciseId, set.set_number, {
      weight: parseOptionalFloat(draft.weight),
      reps: parseOptionalInteger(draft.reps),
      rir: parseOptionalInteger(draft.rir),
      is_completed: !set.is_completed,
    });

    if (!set.is_completed) {
      startRestTimer();
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    }
  };

  const getPrevSet = (setNumber: number) => {
    if (!prevEx) return null;
    return (prevEx.sets as any[]).find((s: any) => s.set_number === setNumber) ?? null;
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buildPickedExercise = (exercise: Partial<ExerciseFormData>): ExerciseFormData => ({
    exercise_id: exercise.exercise_id,
    name: exercise.name ?? '',
    video_url: exercise.video_url ?? '',
    sets: currentEx?.sets?.length || DEFAULT_SESSION_SETS,
    reps: exercise.reps ?? '8-10',
    weight: exercise.weight ?? 0,
    rir: exercise.rir ?? '1-2',
    notes: exercise.notes ?? '',
  });

  if (!currentEx) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.no_exercises_in_session', 'Немає вправ у цьому тренуванні')}</p>
        <button onClick={onBack} className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900'}`}>
          <ChevronLeft size={16} /> {t('workout.journal_tab.back', 'Назад')}
        </button>
      </div>
    );
  }

  const isExerciseLocked = currentEx.status === 'skipped' || currentEx.status === 'replaced';
  const statusAccent = currentEx.status === 'skipped'
    ? '#ef4444'
    : currentEx.status === 'replaced'
      ? '#f59e0b'
      : themeColor;
  const heroBackground = isExerciseLocked
    ? `linear-gradient(135deg, ${statusAccent}33 0%, #18181b 100%)`
    : `linear-gradient(135deg, ${themeColor}ee 0%, #18181b 100%)`;
  const statusPanelClass = currentEx.status === 'skipped'
    ? isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
    : currentEx.status === 'replaced'
      ? isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
      : isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const disabledInputClass = isExerciseLocked
    ? isDark ? 'bg-zinc-950/70 border-zinc-900 text-zinc-600 placeholder:text-zinc-700 cursor-not-allowed' : 'bg-zinc-100 border-zinc-200 text-zinc-400 placeholder:text-zinc-300 cursor-not-allowed'
    : isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-800 focus:border-zinc-700' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-300';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-4">

      <div className="flex items-center gap-3 bg-transparent">
        <button onClick={onBack} className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isDark ? 'bg-zinc-900/80 text-zinc-100' : 'bg-white text-zinc-900 shadow-sm border border-zinc-100'}`}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1.5">
            <p className={`text-[11px] font-bold uppercase tracking-wider truncate max-w-[60%] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{sessionMeta.name}</p>
            <p className={`text-[10px] font-bold flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{completedSets}/{totalSets} {t('workout.journal_tab.sets_count', 'підх')}</p>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
            <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} style={{ background: themeColor }} transition={{ type: 'spring', damping: 20 }} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {exercises.map((ex: any, idx: number) => {
          const sets = ex.sets ?? [];
          const done = sets.length > 0 && sets.every((s: any) => s.is_completed);
          const partial = !done && sets.some((s: any) => s.is_completed);
          const isCurrent = idx === activeIdx;
          const skipped = ex.status === 'skipped';
          const replaced = ex.status === 'replaced';
          const statusStyle = skipped ? { background: '#ef4444' } : replaced ? { background: '#f59e0b' } : { background: themeColor };
          return (
            <button key={ex.id} onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap border ${isCurrent ? 'text-white border-transparent shadow-md'
                  : skipped ? isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'
                    : replaced ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                      : done ? isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200'
                        : partial ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
                          : isDark ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200'
                }`}
              style={isCurrent ? statusStyle : {}}
            >
              {skipped && <SkipForward size={12} className="inline mr-1" />}
              {replaced && <Shuffle size={12} className="inline mr-1" />}
              {done && <Check size={12} className="inline mr-1" />}
              {partial && <Activity size={12} className="inline mr-1" />}
              {ex.name?.split(' ').slice(0, 3).join(' ')}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl border" style={{ background: heroBackground, borderColor: isExerciseLocked ? `${statusAccent}55` : 'transparent' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Dumbbell size={12} /> {t('workout.journal_tab.exercise_index', { current: activeIdx + 1, total: exercises.length })}
            </p>
            <h2 className="text-2xl font-black leading-tight tracking-tight">{currentEx.name}</h2>
          </div>
          {currentEx.video_url && (
            <button onClick={() => openVideo(currentEx.video_url!)} className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all px-3 py-2 rounded-xl text-xs font-semibold">
              <Video size={14} /> {t('workout.journal_tab.watch_technique', 'Дивитись техніку')}
            </button>
          )}

          <div className="pt-2">
            {prevEx ? (
              <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest flex items-center gap-1"><Calendar size={12} /> {t('workout.journal_tab.last_time', 'Минулий раз')}</p>
                  <p className="text-[10px] text-white/50 font-medium">{previousSession?.date}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <p className="text-lg font-black">{Math.max(...(prevEx.sets as any[]).map((s: any) => s.weight ?? 0))}</p>
                    <p className="text-[9px] text-white/50 uppercase font-bold">{t('workout.journal_tab.max_kg', 'макс кг')}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <p className="text-lg font-black">{(prevEx.sets as any[]).reduce((acc: number, s: any) => acc + (s.reps ?? 0), 0)}</p>
                    <p className="text-[9px] text-white/50 uppercase font-bold">{t('workout.journal_tab.reps_count', 'повт')}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <p className="text-lg font-black">{calcVolume(prevEx.sets as any[])}</p>
                    <p className="text-[9px] text-white/50 uppercase font-bold">{t('workout.journal_tab.volume_kg', 'об\'єм кг')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/10 rounded-2xl p-4 border border-white/5 text-center">
                <Flame size={20} className="mx-auto mb-1 text-white/30" />
                <p className="text-[11px] text-white/60 font-medium">{t('workout.journal_tab.first_time', 'Перше виконання вправи')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-3xl border p-3 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPickerMode('add')}
            className={`py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
          >
            <Plus size={14} /> {t('workout.journal_tab.add_exercise', '+ Вправа')}
          </button>
          <button
            onClick={() => setPickerMode('replace')}
            disabled={currentEx.status === 'skipped' || currentEx.status === 'replaced'}
            className={`py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
          >
            <Shuffle size={14} /> {t('workout.journal_tab.replace_exercise', 'Замінити')}
          </button>
          <button
            onClick={() => void onSkipExercise(currentEx.id)}
            disabled={currentEx.status === 'skipped' || currentEx.status === 'replaced'}
            className={`py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
          >
            <SkipForward size={14} /> {t('workout.journal_tab.skip_exercise', 'Пропустити')}
          </button>
        </div>
        {(currentEx.status === 'skipped' || currentEx.status === 'replaced') && (
          <p className={`text-[11px] font-semibold text-center mt-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {currentEx.status === 'skipped'
              ? t('workout.journal_tab.skipped_status', 'Цю вправу пропущено у сьогоднішньому тренуванні')
              : t('workout.journal_tab.replaced_status', 'Цю вправу замінено у сьогоднішньому тренуванні')}
          </p>
        )}
      </div>

      <div className={`rounded-3xl border overflow-hidden ${statusPanelClass}`}>
        <div className={`px-5 py-4 border-b flex justify-between items-center ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
          <div>
            <p className={`text-sm font-bold ${isExerciseLocked ? currentEx.status === 'skipped' ? 'text-red-400' : 'text-amber-400' : isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t('workout.journal_tab.sets', 'Підходи')}</p>
            <p className={`text-[10px] mt-0.5 ${isExerciseLocked ? currentEx.status === 'skipped' ? 'text-red-400/70' : 'text-amber-500/80' : isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {isExerciseLocked
                ? currentEx.status === 'skipped'
                  ? t('workout.journal_tab.skipped_status', 'Цю вправу пропущено у сьогоднішньому тренуванні')
                  : t('workout.journal_tab.replaced_status', 'Цю вправу замінено у сьогоднішньому тренуванні')
                : t('workout.journal_tab.track_results', 'Трекай свої результати')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-1 px-5 pt-4 pb-2">
          <p className={`col-span-2 text-[9px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>#</p>
          <p className={`col-span-3 text-[9px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.kg', 'КГ')}</p>
          <p className={`col-span-3 text-[9px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.reps', 'ПОВТ')}</p>
          <p className={`col-span-2 text-[9px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.rir', 'RIR')}</p>
          <p className={`col-span-2 text-[9px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}></p>
        </div>

        <div className="px-3 pb-4 space-y-2">
          {(currentEx.sets ?? []).map((set: any) => {
            const prevSet = getPrevSet(set.set_number);
            const draft = drafts[set.id] ?? {
              weight: toInputValue(set.weight),
              reps: toInputValue(set.reps),
              rir: toInputValue(set.rir),
            };
            const isSavingSet = savingSetKeys[getSetKey(currentEx.id, set.set_number)] === true;
            const disabled = isSavingSet || isExerciseLocked;
            return (
              <div key={set.id} className={`grid grid-cols-12 gap-1 items-center transition-all duration-300 p-1.5 rounded-2xl ${isExerciseLocked ? isDark ? 'bg-zinc-950/40 opacity-70' : 'bg-white/60 opacity-70' : set.is_completed ? isDark ? 'bg-zinc-800/50 opacity-60' : 'bg-zinc-50 opacity-60' : isDark ? 'bg-zinc-800/20' : 'bg-white'}`}>
                <div className="col-span-2 flex justify-center">
                  <span className={`text-[11px] font-black w-8 h-8 rounded-xl flex items-center justify-center transition-all ${set.is_completed ? 'text-white shadow-sm' : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}
                    style={set.is_completed ? { background: themeColor } : {}}>
                    {set.set_number}
                  </span>
                </div>

                <input type="number" inputMode="decimal"
                  value={draft.weight}
                  placeholder={prevSet?.weight?.toString() ?? '—'}
                  onChange={(e) => updateDraft(set.id, 'weight', e.target.value)}
                  onBlur={() => void handleCommitField(currentEx.id, set.set_number, set.id, 'weight')}
                  disabled={disabled}
                  className={`col-span-3 w-full text-center text-sm font-bold rounded-xl py-3 outline-none transition-all border ${disabledInputClass}`}
                />

                <input type="number" inputMode="numeric"
                  value={draft.reps}
                  placeholder={prevSet?.reps?.toString() ?? '—'}
                  onChange={(e) => updateDraft(set.id, 'reps', e.target.value)}
                  onBlur={() => void handleCommitField(currentEx.id, set.set_number, set.id, 'reps')}
                  disabled={disabled}
                  className={`col-span-3 w-full text-center text-sm font-bold rounded-xl py-3 outline-none transition-all border ${disabledInputClass}`}
                />

                <select
                  value={draft.rir}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    updateDraft(set.id, 'rir', nextValue);
                    void persistSet(currentEx.id, set.set_number, {
                      rir: parseOptionalInteger(nextValue),
                    });
                  }}
                  disabled={disabled}
                  className={`col-span-2 w-full text-center text-sm font-bold rounded-xl py-3 outline-none transition-all border appearance-none ${disabledInputClass}`}>
                  <option value="">—</option>
                  {[0, 1, 2, 3].map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => void handleToggleSet(currentEx.id, set)}
                    disabled={disabled}
                    className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold transition-all active:scale-90 border disabled:cursor-not-allowed ${set.is_completed ? 'text-white border-transparent shadow-md' : isExerciseLocked ? isDark ? 'bg-zinc-950 border-zinc-900 text-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-300' : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-600' : 'bg-zinc-50 border-zinc-200 text-zinc-300'}`}
                    style={set.is_completed ? { background: themeColor } : {}}>
                    {set.is_completed && <Check size={16} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pb-6 pt-2">
        {activeIdx > 0 ? (
          <button onClick={() => setActiveIdx(i => i - 1)} className={`flex-1 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>{t('workout.journal_tab.prev', '← Назад')}</button>
        ) : <div className="flex-1" />}
        {activeIdx < exercises.length - 1 ? (
          <button onClick={() => setActiveIdx(i => i + 1)} className="flex-1 py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg" style={{ background: themeColor }}>{t('workout.journal_tab.next', 'Наступна →')}</button>
        ) : (
          <button onClick={onFinish} className="flex-1 py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg bg-emerald-500 flex justify-center items-center gap-2">
            <Check size={18} strokeWidth={3} /> {t('workout.journal_tab.finish', 'Завершити')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {(restRunning || restDone) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`sticky bottom-3 z-30 rounded-3xl border p-3 shadow-2xl ${isDark ? 'bg-zinc-950/95 border-zinc-800' : 'bg-white/95 border-zinc-200'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: restDone ? '#10b981' : themeColor }}>
                <TimerReset size={20} />
              </div>
              <div className="flex-1">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {restDone ? t('workout.journal_tab.rest_done', 'Відпочинок завершено') : t('workout.journal_tab.rest', 'Відпочинок')}
                </p>
                <p className={`text-2xl font-black tabular-nums leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatTimer(restSeconds)}</p>
              </div>
              {!restDone && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setRestSeconds(prev => Math.max(prev - restTimerSettings.adjustSeconds, 0))}
                    className={`px-3 py-2 rounded-xl text-xs font-black ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
                  >
                    -{restTimerSettings.adjustSeconds}
                  </button>
                  <button
                    onClick={() => setRestSeconds(prev => prev + restTimerSettings.adjustSeconds)}
                    className={`px-3 py-2 rounded-xl text-xs font-black ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
                  >
                    +{restTimerSettings.adjustSeconds}
                  </button>
                </div>
              )}
              <button
                onClick={() => { setRestRunning(false); setRestDone(false); setRestSeconds(0); }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pickerMode && (
        <ExercisePickerSheet
          user={user}
          isDark={isDark}
          themeColor={themeColor}
          title={pickerMode === 'replace' ? t('workout.journal_tab.replace_exercise', 'Замінити вправу') : t('workout.journal_tab.add_exercise', 'Додати вправу')}
          onClose={() => setPickerMode(null)}
          onSelect={(exercise) => {
            const payload = buildPickedExercise(exercise);
            if (!payload.name.trim()) return;
            if (pickerMode === 'replace') void onReplaceExercise(currentEx.id, payload);
            else void onAddExercise(payload);
          }}
        />
      )}
    </motion.div>
  );
};

const ExerciseQuickList = ({ sessionId, isDark }: { sessionId: number; isDark: boolean; themeColor: string }) => {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('session_exercises').select('id, name, status').eq('session_id', sessionId).order('order_index')
      .then(({ data }) => { if (data) setExercises(data); setLoaded(true); });
  }, [sessionId]);

  if (!loaded) return <p className={`text-[10px] ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>…</p>;
  if (exercises.length === 0) return <p className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{t('workout.journal_tab.no_exercises', 'Немає вправ')}</p>;

  return (
    <>
      {exercises.map((ex, i) => (
        <span key={ex.id} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${ex.status === 'skipped' || ex.status === 'replaced' ? isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-600 line-through' : 'bg-zinc-50 border-zinc-200 text-zinc-400 line-through' : isDark ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
          {i + 1}. {ex.name}{ex.status === 'replaced' ? ` · ${t('workout.journal_tab.replaced_short', 'замінено')}` : ex.status === 'skipped' ? ` · ${t('workout.journal_tab.skipped_short', 'пропущено')}` : ''}
        </span>
      ))}
    </>
  );
};

const PlanPickerSheet = ({ plans, isDark, onSelect, onClose }: { plans: WorkoutPlan[]; isDark: boolean; themeColor: string; onSelect: (id: number) => void; onClose: () => void }) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed bottom-0 left-0 right-0 z-[101] p-6 rounded-t-3xl border-t ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'}`}>
        <div className="w-12 h-1.5 rounded-full bg-zinc-500/30 mx-auto mb-6" />
        <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t('workout.journal_tab.choose_plan_title', 'Обери план')}</h3>

        {plans.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center opacity-50">
            <CalendarPlus size={32} className="mb-2" />
            <p className="text-sm font-medium">{t('workout.journal_tab.no_plans_for_picker', 'Немає планів. Створи їх у вкладці «Плани»')}</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8 max-h-[60vh] overflow-y-auto">
            {plans.map(plan => (
              <button key={plan.id} onClick={() => onSelect(plan.id)} className={`w-full flex items-center p-4 rounded-2xl border transition-all active:scale-[0.98] ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-zinc-500 shadow-sm'}`}>
                  <Dumbbell size={18} />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{plan.name}</p>
                  {plan.muscle_group && <p className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{plan.muscle_group}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export const JournalTab = ({ user, isDark, themeColor = '#8b5cf6' }: JournalTabProps) => {
  const { t, i18n } = useTranslation();
  const { toast, showToast, hideToast } = useToast();
  const currentLocale = i18n.language || 'uk';
  const todayDate = useRef(new Date());
  todayDate.current.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(new Date(todayDate.current));
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, WorkoutSession['status'][]>>({});
  const [activeWorkout, setActiveWorkout] = useState<{ sessionMeta: WorkoutSession; sessionFull: SessionWithExercises; previousSession: SessionWithExercises | null } | null>(null);
  const [restTimerSettings, setRestTimerSettings] = useState<RestTimerSettings>({
    enabled: true,
    defaultSeconds: 90,
    adjustSeconds: 30,
  });

  const isToday = toDateStr(viewDate) === toDateStr(todayDate.current);
  const weekDays = getWeekDays(viewDate);
  const fadeIn = useFadeIn(!loading);

  const loadSessionDates = useCallback(async () => {
    if (!user?.id) return;
    const from = toDateStr(addDays(todayDate.current, -60));
    const to = toDateStr(addDays(todayDate.current, 30));
    try {
      setSessionStatuses(await getSessionStatusesByDateRange(user.id, from, to));
    } catch (e) { console.error(e); }
  }, [user?.id]);

  const loadDay = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await getSessionsByDate(user.id, toDateStr(viewDate));
      setSessions(list);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user?.id, viewDate]);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { loadSessionDates(); }, [loadSessionDates]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('rest_timer_enabled, rest_timer_default_seconds, rest_timer_adjust_seconds')
      .eq('telegram_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRestTimerSettings({
          enabled: data.rest_timer_enabled ?? true,
          defaultSeconds: data.rest_timer_default_seconds ?? 90,
          adjustSeconds: data.rest_timer_adjust_seconds ?? 30,
        });
      });
  }, [user?.id]);

  const openActiveWorkout = async (session: WorkoutSession) => {
    setSaving(true);
    try {
      let updatedSession = session;
      if (session.status === 'planned') {
        await updateSessionStatus(session.id, 'in_progress');
        updatedSession = { ...session, status: 'in_progress' };
        setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
        setSessionStatuses(prev => {
          const date = updatedSession.date || toDateStr(viewDate);
          const statuses = prev[date] ?? [];
          return { ...prev, [date]: statuses.includes('in_progress') ? statuses : [...statuses, 'in_progress'] };
        });
      }
      const full = await getSessionWithExercises(session.id);
      if (!full) { setSaving(false); return; }
      let prev: SessionWithExercises | null = null;
      if (session.plan_id && user?.id) {
        try { prev = await getPreviousSession(user.id, session.plan_id, toDateStr(viewDate)); } catch (e) { console.error(e); }
      }
      setActiveWorkout({ sessionMeta: updatedSession, sessionFull: full, previousSession: prev });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleSaveSet = useCallback(async (
    exerciseId: number,
    setNumber: number,
    data: Partial<Pick<SessionSet, 'reps' | 'weight' | 'rir' | 'is_completed'>>
  ) => {
    if (!activeWorkout) return;
    const previousSet = activeWorkout.sessionFull.exercises
      .find((exercise) => exercise.id === exerciseId)
      ?.sets.find((set) => set.set_number === setNumber);

    if (!previousSet) {
      return;
    }

    setActiveWorkout(prev => {
      if (!prev) return prev;
      const newExercises = prev.sessionFull.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const newSets = ex.sets.map(s => {
          if (s.set_number !== setNumber) return s;
          return { ...s, ...data };
        });
        return { ...ex, sets: newSets };
      });
      return { ...prev, sessionFull: { ...prev.sessionFull, exercises: newExercises } };
    });

    try {
      await upsertSet(exerciseId, setNumber, data);
    } catch (e) {
      setActiveWorkout(prev => {
        if (!prev) return prev;
        const newExercises = prev.sessionFull.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const newSets = ex.sets.map(s => s.set_number === setNumber ? previousSet : s);
          return { ...ex, sets: newSets };
        });
        return { ...prev, sessionFull: { ...prev.sessionFull, exercises: newExercises } };
      });
      console.error(e);
      showToast(t('workout.journal_tab.save_error', 'Не вдалося зберегти підхід'), 'error');
      throw e;
    }
  }, [activeWorkout, showToast, t]);

  const reloadActiveWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    const full = await getSessionWithExercises(activeWorkout.sessionMeta.id);
    if (!full) return;
    setActiveWorkout(prev => prev ? { ...prev, sessionFull: full } : prev);
  }, [activeWorkout]);

  const handleAddSessionExercise = useCallback(async (data: ExerciseFormData) => {
    if (!user?.id || !activeWorkout) return;
    try {
      await addExerciseToSession(user.id, activeWorkout.sessionMeta.id, data);
      await reloadActiveWorkout();
    } catch (e) {
      console.error(e);
      showToast(t('workout.journal_tab.save_error', 'Не вдалося зберегти підхід'), 'error');
    }
  }, [activeWorkout, reloadActiveWorkout, showToast, t, user?.id]);

  const handleReplaceSessionExercise = useCallback(async (sessionExerciseId: number, data: ExerciseFormData) => {
    if (!user?.id) return;
    try {
      await replaceSessionExercise(user.id, sessionExerciseId, data);
      await reloadActiveWorkout();
    } catch (e) {
      console.error(e);
      showToast(t('workout.journal_tab.save_error', 'Не вдалося зберегти підхід'), 'error');
    }
  }, [reloadActiveWorkout, showToast, t, user?.id]);

  const handleSkipSessionExercise = useCallback(async (sessionExerciseId: number) => {
    try {
      await skipSessionExercise(sessionExerciseId);
      await reloadActiveWorkout();
    } catch (e) {
      console.error(e);
      showToast(t('workout.journal_tab.save_error', 'Не вдалося зберегти підхід'), 'error');
    }
  }, [reloadActiveWorkout, showToast, t]);

  const handleFinishWorkout = async () => {
    if (!activeWorkout) return;
    try {
      await updateSessionStatus(activeWorkout.sessionMeta.id, 'completed');
      setActiveWorkout(null);
      await loadDay();
      await loadSessionDates();
    } catch (e) { console.error(e); }
  };

  const handleBackFromWorkout = async () => { setActiveWorkout(null); await loadDay(); };

  const loadPlans = async () => {
    if (!user?.id) return;
    const p = await getPlans(user.id);
    setPlans(p);
    setShowPlanPicker(true);
  };

  const handleStartFromPlan = async (planId: number) => {
    if (!user?.id) return;
    setShowPlanPicker(false);
    setSaving(true);
    try {
      await createSessionFromPlan(user.id, planId, toDateStr(viewDate));
      await loadDay();
      await loadSessionDates();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (activeWorkout) {
    return (
        <ActiveWorkoutView
          user={user}
          sessionFull={activeWorkout.sessionFull}
          sessionMeta={activeWorkout.sessionMeta}
          previousSession={activeWorkout.previousSession}
          isDark={isDark} themeColor={themeColor}
          restTimerSettings={restTimerSettings}
          onBack={handleBackFromWorkout} onFinish={handleFinishWorkout}
          onAddExercise={handleAddSessionExercise}
          onReplaceExercise={handleReplaceSessionExercise}
          onSkipExercise={handleSkipSessionExercise}
          onSaveSet={handleSaveSet}
        />
      );
  }

  if (loading) return <JournalTabSkeleton isDark={isDark} />;

  return (
    <div className="space-y-4 pb-20">

      <div style={fadeIn.style(0)} className={`rounded-3xl p-4 shadow-sm border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center justify-between mb-4 px-1">
          <button onClick={() => setViewDate(prev => addDays(prev, -7))} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
            <ChevronLeft size={16} />
          </button>
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{new Intl.DateTimeFormat(currentLocale, { month: 'long', year: 'numeric' }).format(viewDate)}</p>
          <button onClick={() => setViewDate(prev => addDays(prev, 7))} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d, i) => (
            <p key={`label-${i}`} className={`text-[9px] font-bold uppercase tracking-wider text-center mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{new Intl.DateTimeFormat(currentLocale, { weekday: 'short' }).format(d)}</p>
          ))}

          {weekDays.map((d, i) => {
            const dStr = toDateStr(d);
            const isFuture = d > todayDate.current;
            const isSelected = dStr === toDateStr(viewDate);
            const isT = dStr === toDateStr(todayDate.current);
            const dotColor = getWorkoutDotColor(sessionStatuses[dStr] ?? [], themeColor);
            return (
              <button key={`day-${i}`} onClick={() => !isFuture && setViewDate(new Date(d))} disabled={isFuture}
                className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 ${isFuture ? isDark ? 'text-zinc-800 cursor-default' : 'text-zinc-200 cursor-default'
                    : isSelected ? 'text-white shadow-lg'
                      : isT ? isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900 shadow-sm'
                        : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-600'
                  }`}
                style={isSelected && !isFuture ? { background: themeColor } : {}}
              >
                <span className="text-sm font-black leading-none">{d.getDate()}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{
                    backgroundColor: dotColor ?? 'transparent',
                    boxShadow: isSelected && dotColor ? '0 0 0 1px rgba(255,255,255,0.9)' : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div style={fadeIn.style(1)} className="flex items-center justify-between px-2">
        <p className={`text-lg font-black tracking-tight capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {formatDisplayDate(viewDate, currentLocale)}
        </p>
        {isToday && <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg text-white shadow-md" style={{ background: themeColor }}>{t('workout.journal_tab.today', 'Сьогодні')}</span>}
      </div>

      {saving ? (
        <JournalTabSkeleton isDark={isDark} />
      ) : sessions.length === 0 ? (
        <div style={fadeIn.style(2)} className="pt-4">
          <div className={`rounded-3xl p-8 flex flex-col items-center gap-4 text-center border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <Dumbbell size={32} className={isDark ? 'text-zinc-600' : 'text-zinc-400'} />
            </div>
            <div>
              <p className={`font-bold text-lg mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {isToday ? t('workout.journal_tab.training_not_planned', 'Тренування не заплановано') : t('workout.journal_tab.no_trainings', 'Не було тренувань')}
              </p>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{t('workout.journal_tab.choose_plan_desc', 'Вибери готовий план та почни роботу')}</p>
            </div>
            <button onClick={loadPlans} className="mt-2 w-full py-4 rounded-2xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95" style={{ background: themeColor }}>
              {t('workout.journal_tab.choose_plan_btn', 'Обрати план')}
            </button>
          </div>
        </div>
      ) : (
        <div style={fadeIn.style(2)} className="space-y-4">
          {sessions.map((session, sIdx) => {
            const isCompleted = session.status === 'completed';
            const isInProgress = session.status === 'in_progress';

            let statusColor = themeColor;
            if (isCompleted) statusColor = '#10b981';
            if (isInProgress) statusColor = '#f59e0b';

            return (
              <div key={session.id} className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {sessions.length > 1 && <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.workout', 'Тренування')} {sIdx + 1}</p>}
                      <h3 className={`font-black text-lg leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{session.name}</h3>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg text-white flex-shrink-0 shadow-sm" style={{ background: statusColor }}>
                      {isCompleted ? t('workout.journal_tab.completed', 'Завершено') : isInProgress ? t('workout.journal_tab.in_progress', 'В процесі') : t('workout.journal_tab.planned', 'План')}
                    </span>
                  </div>

                  <div className={`px-4 py-3 rounded-2xl mb-4 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.exercise_list', 'Список вправ')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <ExerciseQuickList sessionId={session.id} isDark={isDark} themeColor={themeColor} />
                    </div>
                  </div>

                  <button onClick={() => openActiveWorkout(session)}
                    className={`w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isCompleted ? isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600' : 'text-white shadow-lg'}`}
                    style={isCompleted ? {} : { background: themeColor }}
                  >
                    {isCompleted ? t('workout.journal_tab.view_results', 'Переглянути результати') : isInProgress ? <><Play size={16} fill="currentColor" /> {t('workout.journal_tab.continue', 'Продовжити')}</> : <><Play size={16} fill="currentColor" /> {t('workout.journal_tab.start', 'Розпочати')}</>}
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={loadPlans} className={`w-full py-4 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 font-bold text-sm transition-transform active:scale-[0.98] ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50' : 'border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}>
            <CalendarPlus size={16} /> {t('workout.journal_tab.add_more_workouts', 'Додати ще тренування')}
          </button>
        </div>
      )}

      {showPlanPicker && <PlanPickerSheet plans={plans} isDark={isDark} themeColor={themeColor} onSelect={handleStartFromPlan} onClose={() => setShowPlanPicker(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};
