import { useState, useEffect, useCallback, useRef } from 'react';
import type { TelegramUser, WorkoutSession, SessionWithExercises } from '../../types/types';
import { JournalTabSkeleton } from '../../components/Skeleton';
import { useFadeIn } from '../../utils/useFadeIn';
import {
  getSessionsByDate,
  getSessionWithExercises,
  createSessionFromPlan,
  updateSessionStatus,
  upsertSet,
  getPreviousSession,
  getPlans,
} from '../../utils/workoutService';
import type { WorkoutPlan } from '../../types/types';
import supabase from '../../supabase/supabase-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Play, Check, X, Timer, Dumbbell, CalendarPlus, 
  Video, Calendar, Flame, Activity
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

const openVideo = (url: string) => {
  if (!url) return;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  const finalUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : url;
  if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(finalUrl);
  else window.open(finalUrl, '_blank');
};

interface ActiveWorkoutProps {
  sessionFull: SessionWithExercises;
  sessionMeta: WorkoutSession;
  previousSession: SessionWithExercises | null;
  isDark: boolean;
  themeColor: string;
  onBack: () => void;
  onFinish: () => void;
  onUpdateSet: (exerciseId: number, setNumber: number, field: string, value: number | boolean) => Promise<void>;
}

const ActiveWorkoutView = ({
  sessionFull, sessionMeta, previousSession,
  isDark, themeColor, onBack, onFinish, onUpdateSet,
}: ActiveWorkoutProps) => {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);
  const exercises = sessionFull.exercises ?? [];
  const currentEx = exercises[activeIdx];
  const prevEx = previousSession?.exercises?.find((e: any) => e.plan_exercise_id === currentEx?.plan_exercise_id);

  const totalSets = exercises.reduce((s: number, ex: any) => s + (ex.sets?.length ?? 0), 0);
  const completedSets = exercises.reduce((s: number, ex: any) => s + (ex.sets?.filter((st: any) => st.is_completed).length ?? 0), 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft === 0) {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        navigator.vibrate?.([200, 100, 200]);
      }
      return;
    }
    const t = setInterval(() => setTimeLeft(l => (l && l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleUpdateAndTimer = async (exId: number, setNum: number, field: string, val: any) => {
    await onUpdateSet(exId, setNum, field, val);
    if (field === 'is_completed' && val === true) {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      setTimeLeft(90); 
    }
  };

  const getPrevSet = (setNumber: number) => {
    if (!prevEx) return null;
    return (prevEx.sets as any[]).find((s: any) => s.set_number === setNumber) ?? null;
  };

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-4">
      
      {/* Header */}
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

      {/* Horizontal Nav */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {exercises.map((ex: any, idx: number) => {
          const sets = ex.sets ?? [];
          const done = sets.length > 0 && sets.every((s: any) => s.is_completed);
          const partial = !done && sets.some((s: any) => s.is_completed);
          const isCurrent = idx === activeIdx;
          return (
            <button key={ex.id} onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap border ${
                isCurrent ? 'text-white border-transparent shadow-md'
                : done ? isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200'
                : partial ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
                : isDark ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200'
              }`}
              style={isCurrent ? { background: themeColor } : {}}
            >
              {done && <Check size={12} className="inline mr-1" />}
              {partial && <Activity size={12} className="inline mr-1" />}
              {ex.name?.split(' ').slice(0, 3).join(' ')}
            </button>
          );
        })}
      </div>

      {/* Focus Exercise Card */}
      <div className="rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl" style={{ background: `linear-gradient(135deg, ${themeColor}ee 0%, #18181b 100%)` }}>
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
                  <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest flex items-center gap-1"><Calendar size={12}/> {t('workout.journal_tab.last_time', 'Минулий раз')}</p>
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

      {/* Sets Tracker */}
      <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'}`}>
        <div className={`px-5 py-4 border-b flex justify-between items-center ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t('workout.journal_tab.sets', 'Підходи')}</p>
            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.track_results', 'Трекай свої результати')}</p>
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
            return (
              <div key={set.id} className={`grid grid-cols-12 gap-1 items-center transition-all duration-300 p-1.5 rounded-2xl ${set.is_completed ? isDark ? 'bg-zinc-800/50 opacity-60' : 'bg-zinc-50 opacity-60' : isDark ? 'bg-zinc-800/20' : 'bg-white'}`}>
                <div className="col-span-2 flex justify-center">
                  <span className={`text-[11px] font-black w-8 h-8 rounded-xl flex items-center justify-center transition-all ${set.is_completed ? 'text-white shadow-sm' : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}
                    style={set.is_completed ? { background: themeColor } : {}}>
                    {set.set_number}
                  </span>
                </div>
                
                <input key={`w-${set.id}-${set.weight}`} type="number" inputMode="decimal"
                  defaultValue={set.weight !== null && set.weight !== undefined ? set.weight : ''}
                  placeholder={prevSet?.weight?.toString() ?? '—'}
                  onBlur={e => { const val = parseFloat(e.target.value); if (!isNaN(val)) onUpdateSet(currentEx.id, set.set_number, 'weight', val); }}
                  className={`col-span-3 w-full text-center text-sm font-bold rounded-xl py-3 outline-none transition-all border ${isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-800 focus:border-zinc-700' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-300'}`}
                />
                
                <input key={`r-${set.id}-${set.reps}`} type="number" inputMode="numeric"
                  defaultValue={set.reps !== null && set.reps !== undefined ? set.reps : ''}
                  placeholder={prevSet?.reps?.toString() ?? '—'}
                  onBlur={e => { const val = parseInt(e.target.value); if (!isNaN(val)) onUpdateSet(currentEx.id, set.set_number, 'reps', val); }}
                  className={`col-span-3 w-full text-center text-sm font-bold rounded-xl py-3 outline-none transition-all border ${isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-800 focus:border-zinc-700' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-300'}`}
                />
                
                <select value={set.rir ?? ''} onChange={e => onUpdateSet(currentEx.id, set.set_number, 'rir', parseInt(e.target.value))}
                  className={`col-span-2 w-full text-center text-sm font-bold rounded-xl py-3 outline-none transition-all border appearance-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white focus:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white'}`}>
                  <option value="">—</option>
                  {[0, 1, 2, 3].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => handleUpdateAndTimer(currentEx.id, set.set_number, 'is_completed', !set.is_completed)}
                    className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold transition-all active:scale-90 border ${set.is_completed ? 'text-white border-transparent shadow-md' : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-600' : 'bg-zinc-50 border-zinc-200 text-zinc-300'}`}
                    style={set.is_completed ? { background: themeColor } : {}}>
                    {set.is_completed && <Check size={16} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
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

      {/* Floating Rest Timer */}
      <AnimatePresence>
        {timeLeft !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-24 left-4 right-4 z-50 flex items-center justify-between p-4 rounded-3xl shadow-2xl border backdrop-blur-xl ${isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-zinc-200'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${timeLeft === 0 ? 'bg-green-500 text-white' : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                 <Timer size={24} className={timeLeft === 0 ? 'animate-pulse' : ''} />
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.journal_tab.rest', 'Відпочинок')}</p>
                <p className={`font-mono text-2xl font-black ${timeLeft === 0 ? 'text-green-500' : isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <button onClick={() => setTimeLeft(l => l ? l + 30 : 30)} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>+30</button>
                <button onClick={() => setTimeLeft(l => l && l > 30 ? l - 30 : 0)} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>-30</button>
              </div>
              <button onClick={() => setTimeLeft(null)} className={`w-12 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ExerciseQuickList = ({ sessionId, isDark }: { sessionId: number; isDark: boolean; themeColor: string }) => {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('session_exercises').select('id, name').eq('session_id', sessionId).order('order_index')
      .then(({ data }) => { if (data) setExercises(data); setLoaded(true); });
  }, [sessionId]);

  if (!loaded) return <p className={`text-[10px] ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>…</p>;
  if (exercises.length === 0) return <p className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{t('workout.journal_tab.no_exercises', 'Немає вправ')}</p>;

  return (
    <>
      {exercises.map((ex, i) => (
        <span key={ex.id} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
          {i + 1}. {ex.name}
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
  const currentLocale = i18n.language || 'uk';
  const todayDate = useRef(new Date());
  todayDate.current.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(new Date(todayDate.current));
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [sessionDates, setSessionDates] = useState<Set<string>>(new Set());
  const [activeWorkout, setActiveWorkout] = useState<{ sessionMeta: WorkoutSession; sessionFull: SessionWithExercises; previousSession: SessionWithExercises | null } | null>(null);

  const isToday = toDateStr(viewDate) === toDateStr(todayDate.current);
  const weekDays = getWeekDays(viewDate);
  const fadeIn = useFadeIn(!loading);

  const loadSessionDates = useCallback(async () => {
    if (!user?.id) return;
    const from = toDateStr(addDays(todayDate.current, -60));
    const to = toDateStr(addDays(todayDate.current, 30));
    try {
      const { data } = await supabase.from('workout_sessions').select('date').eq('user_id', user.id).gte('date', from).lte('date', to);
      if (data) setSessionDates(new Set(data.map((r: any) => r.date)));
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

  const openActiveWorkout = async (session: WorkoutSession) => {
    setSaving(true);
    try {
      let updatedSession = session;
      if (session.status === 'planned') {
        await updateSessionStatus(session.id, 'in_progress');
        updatedSession = { ...session, status: 'in_progress' };
        setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
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

  const handleUpdateSet = async (exerciseId: number, setNumber: number, field: string, value: number | boolean) => {
    if (!activeWorkout) return;
    
    // Оптимістичне оновлення інтерфейсу (моментально)
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const newExercises = prev.sessionFull.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const newSets = ex.sets.map(s => {
          if (s.set_number !== setNumber) return s;
          return { ...s, [field]: value };
        });
        return { ...ex, sets: newSets };
      });
      return { ...prev, sessionFull: { ...prev.sessionFull, exercises: newExercises } };
    });

    try {
      await upsertSet(exerciseId, setNumber, { [field]: value });
    } catch (e) { 
      console.error(e); 
      // Відкат у випадку помилки можна додати, якщо потрібно
    }
  };

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
        sessionFull={activeWorkout.sessionFull}
        sessionMeta={activeWorkout.sessionMeta}
        previousSession={activeWorkout.previousSession}
        isDark={isDark} themeColor={themeColor}
        onBack={handleBackFromWorkout} onFinish={handleFinishWorkout} onUpdateSet={handleUpdateSet}
      />
    );
  }

  if (loading) return <JournalTabSkeleton isDark={isDark} />;

  return (
    <div className="space-y-4 pb-20">
      
      {/* Calendar Strip */}
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
            const hasSession = sessionDates.has(dStr);
            return (
              <button key={`day-${i}`} onClick={() => !isFuture && setViewDate(new Date(d))} disabled={isFuture}
                className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 ${
                  isFuture ? isDark ? 'text-zinc-800 cursor-default' : 'text-zinc-200 cursor-default'
                  : isSelected ? 'text-white shadow-lg'
                  : isT ? isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900 shadow-sm'
                  : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-600'
                }`}
                style={isSelected && !isFuture ? { background: themeColor } : {}}
              >
                <span className="text-sm font-black leading-none">{d.getDate()}</span>
                <span className={`w-1 h-1 rounded-full mt-1.5 ${hasSession ? isSelected ? 'bg-white' : 'bg-emerald-500' : 'bg-transparent'}`} />
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
            if (isCompleted) statusColor = '#10b981'; // Emerald
            if (isInProgress) statusColor = '#f59e0b'; // Amber

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
    </div>
  );
};