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

const DAY_LABELS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
];

function formatDisplayDate(date: Date): string {
  const days = ['Неділя','Понеділок','Вівторок','Середа','Четвер','П\'ятниця','Субота'];
  const months = ['січня','лютого','березня','квітня','травня','червня',
    'липня','серпня','вересня','жовтня','листопада','грудня'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
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
  const [activeIdx, setActiveIdx] = useState(0);
  const exercises = sessionFull.exercises ?? [];
  const currentEx = exercises[activeIdx];
  const prevEx = previousSession?.exercises?.find((e: any) => e.plan_exercise_id === currentEx?.plan_exercise_id);

  const totalSets = exercises.reduce((s: number, ex: any) => s + (ex.sets?.length ?? 0), 0);
  const completedSets = exercises.reduce((s: number, ex: any) => s + (ex.sets?.filter((st: any) => st.is_completed).length ?? 0), 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const getPrevSet = (setNumber: number) => {
    if (!prevEx) return null;
    return (prevEx.sets as any[]).find((s: any) => s.set_number === setNumber) ?? null;
  };

  if (!currentEx) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Немає вправ у цьому тренуванні</p>
        <button onClick={onBack} className={`px-6 py-3 rounded-xl text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
            <p className={`text-[10px] font-semibold uppercase tracking-wider truncate max-w-[60%] ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{sessionMeta.name}</p>
            <p className={`text-[10px] font-bold flex-shrink-0 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{completedSets}/{totalSets} підх · {activeIdx + 1}/{exercises.length} вправ</p>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: themeColor }} />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {exercises.map((ex: any, idx: number) => {
          const sets = ex.sets ?? [];
          const done = sets.length > 0 && sets.every((s: any) => s.is_completed);
          const partial = !done && sets.some((s: any) => s.is_completed);
          const isCurrent = idx === activeIdx;
          return (
            <button key={ex.id} onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all whitespace-nowrap border ${
                isCurrent ? 'text-white border-transparent'
                : done ? isDark ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'
                : partial ? isDark ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                : isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
              style={isCurrent ? { background: themeColor } : {}}
            >
              {done ? '✓ ' : partial ? '◐ ' : ''}{ex.name?.split(' ').slice(0, 3).join(' ')}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl p-5 text-white relative overflow-hidden shadow-xl" style={{ background: `linear-gradient(135deg, ${themeColor}ee 0%, #6366f1 100%)` }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div>
            <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Вправа {activeIdx + 1} з {exercises.length}</p>
            <h2 className="text-xl font-black leading-tight">{currentEx.name}</h2>
          </div>
          {currentEx.video_url && (
            <button onClick={() => openVideo(currentEx.video_url!)} className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-all px-3 py-1.5 rounded-xl text-[11px] font-semibold">
              <span>▶</span> Дивитись відео
            </button>
          )}
          {currentEx.notes && (
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Нотатка</p>
              <p className="text-xs text-white/80 italic">{currentEx.notes}</p>
            </div>
          )}
          {prevEx ? (
            <div className="bg-white/10 rounded-xl px-3 py-2.5 space-y-2">
              <p className="text-[9px] text-white/50 uppercase tracking-widest">Минулий раз · {previousSession?.date}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-base font-black">{Math.max(...(prevEx.sets as any[]).map((s: any) => s.weight ?? 0))}</p>
                  <p className="text-[9px] text-white/50 uppercase">макс кг</p>
                </div>
                <div>
                  <p className="text-base font-black">{(prevEx.sets as any[]).reduce((acc: number, s: any) => acc + (s.reps ?? 0), 0)}</p>
                  <p className="text-[9px] text-white/50 uppercase">повт</p>
                </div>
                <div>
                  <p className="text-base font-black">{calcVolume(prevEx.sets as any[])}</p>
                  <p className="text-[9px] text-white/50 uppercase">об'єм кг</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-2 space-y-0.5">
                {(prevEx.sets as any[]).map((ps: any) => (
                  <p key={ps.set_number} className="text-[10px] text-white/50">
                    Підхід {ps.set_number}:{' '}
                    <span className="text-white/80 font-semibold">{ps.weight ?? 0} кг × {ps.reps ?? 0} повт</span>
                    {ps.rir != null && <span className="ml-1 opacity-60">RIR {ps.rir}</span>}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] text-white/50 italic">Перший раз — немає даних попереднього разу</p>
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
          <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Підходи</p>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Сіре число = минулий раз (плейсхолдер). Введи нові або залиш.</p>
        </div>
        <div className="grid grid-cols-5 gap-1 px-4 pt-3 pb-1">
          {['#', 'Вага кг', 'Повт', 'RIR', '✓'].map(h => (
            <p key={h} className={`text-[9px] font-semibold uppercase tracking-wider text-center ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{h}</p>
          ))}
        </div>
        <div className="px-3 pb-4 space-y-2.5">
          {(currentEx.sets ?? []).map((set: any) => {
            const prevSet = getPrevSet(set.set_number);
            return (
              <div key={set.id} className={`grid grid-cols-5 gap-1.5 items-center transition-all ${set.is_completed ? 'opacity-50' : ''}`}>
                <div className="flex justify-center">
                  <span className={`text-[11px] font-black w-7 h-7 rounded-xl flex items-center justify-center transition-all ${set.is_completed ? 'text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'}`}
                    style={set.is_completed ? { background: themeColor } : {}}>
                    {set.set_number}
                  </span>
                </div>
                <input key={`w-${set.id}-${set.weight}`} type="number" inputMode="decimal"
                  defaultValue={set.weight !== null && set.weight !== undefined ? set.weight : ''}
                  placeholder={prevSet?.weight?.toString() ?? '—'}
                  onBlur={e => { const val = parseFloat(e.target.value); if (!isNaN(val)) onUpdateSet(currentEx.id, set.set_number, 'weight', val); }}
                  className={`w-full text-center text-sm font-bold rounded-xl py-2 outline-none transition-all border ${isDark ? 'bg-white/10 border-white/10 text-white placeholder:text-white/25 focus:bg-white/20 focus:border-white/30' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300'}`}
                />
                <input key={`r-${set.id}-${set.reps}`} type="number" inputMode="numeric"
                  defaultValue={set.reps !== null && set.reps !== undefined ? set.reps : ''}
                  placeholder={prevSet?.reps?.toString() ?? '—'}
                  onBlur={e => { const val = parseInt(e.target.value); if (!isNaN(val)) onUpdateSet(currentEx.id, set.set_number, 'reps', val); }}
                  className={`w-full text-center text-sm font-bold rounded-xl py-2 outline-none transition-all border ${isDark ? 'bg-white/10 border-white/10 text-white placeholder:text-white/25 focus:bg-white/20 focus:border-white/30' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300'}`}
                />
                <select value={set.rir ?? ''} onChange={e => onUpdateSet(currentEx.id, set.set_number, 'rir', parseInt(e.target.value))}
                  className={`w-full text-center text-sm font-bold rounded-xl py-2 outline-none transition-all border ${isDark ? 'bg-white/10 border-white/10 text-white focus:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-900 focus:bg-white'}`}>
                  <option value="">—</option>
                  {[0, 1, 2, 3].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => onUpdateSet(currentEx.id, set.set_number, 'is_completed', !set.is_completed)}
                  className={`h-9 w-full rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-90 border ${set.is_completed ? 'text-white border-transparent' : isDark ? 'bg-white/10 border-white/10 text-white/40' : 'bg-slate-100 border-slate-200 text-slate-300'}`}
                  style={set.is_completed ? { background: themeColor } : {}}>
                  {set.is_completed ? '✓' : '○'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pb-4">
        {activeIdx > 0 ? (
          <button onClick={() => setActiveIdx(i => i - 1)} className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>← Назад</button>
        ) : <div className="flex-1" />}
        {activeIdx < exercises.length - 1 ? (
          <button onClick={() => setActiveIdx(i => i + 1)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg" style={{ background: themeColor }}>Наступна →</button>
        ) : (
          <button onClick={onFinish} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg bg-green-500">✅ Завершити</button>
        )}
      </div>
    </div>
  );
};

const ExerciseQuickList = ({ sessionId, isDark }: { sessionId: number; isDark: boolean; themeColor: string }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('session_exercises').select('id, name').eq('session_id', sessionId).order('order_index')
      .then(({ data }) => { if (data) setExercises(data); setLoaded(true); });
  }, [sessionId]);

  if (!loaded) return <p className={`text-[10px] ${isDark ? 'text-white/20' : 'text-slate-300'}`}>…</p>;
  if (exercises.length === 0) return <p className={`text-[10px] ${isDark ? 'text-white/20' : 'text-slate-300'}`}>Немає вправ</p>;

  return (
    <>
      {exercises.map((ex, i) => (
        <span key={ex.id} className={`text-[10px] font-medium px-2 py-1 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
          {i + 1}. {ex.name}
        </span>
      ))}
    </>
  );
};

const PlanPickerSheet = ({ plans, isDark, onSelect, onClose }: { plans: WorkoutPlan[]; isDark: boolean; themeColor: string; onSelect: (id: number) => void; onClose: () => void }) => (
  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
    <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Обери план</p>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 text-xl leading-none w-7 h-7 flex items-center justify-center">✕</button>
    </div>
    {plans.length === 0 ? (
      <p className={`p-4 text-sm text-center ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Немає планів. Спочатку створи план у вкладці «Плани»</p>
    ) : (
      <div className="p-2 space-y-1">
        {plans.map(plan => (
          <button key={plan.id} onClick={() => onSelect(plan.id)} className={`w-full text-left p-3 rounded-xl transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</p>
            {plan.muscle_group && <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{plan.muscle_group}</p>}
          </button>
        ))}
      </div>
    )}
  </div>
);

export const JournalTab = ({ user, isDark, themeColor = '#8b5cf6' }: JournalTabProps) => {
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
    try {
      await upsertSet(exerciseId, setNumber, { [field]: value });
      const refreshed = await getSessionWithExercises(activeWorkout.sessionMeta.id);
      if (refreshed) setActiveWorkout(prev => prev ? { ...prev, sessionFull: refreshed } : null);
    } catch (e) { console.error(e); }
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
    <div className="space-y-3">
      <div style={fadeIn.style(0)} className={`rounded-2xl p-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        <div className="flex items-center justify-between mb-2.5">
          <button onClick={() => setViewDate(prev => addDays(prev, -7))} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <p className={`text-[11px] font-semibold ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</p>
          <button onClick={() => setViewDate(prev => addDays(prev, 7))} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((d, i) => (
            <p key={i} className={`text-[9px] font-semibold uppercase tracking-wider text-center ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{DAY_LABELS[d.getDay()]}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d, i) => {
            const dStr = toDateStr(d);
            const isFuture = d > todayDate.current;
            const isSelected = dStr === toDateStr(viewDate);
            const isT = dStr === toDateStr(todayDate.current);
            const hasSession = sessionDates.has(dStr);
            return (
              <button key={i} onClick={() => !isFuture && setViewDate(new Date(d))} disabled={isFuture}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
                  isFuture ? isDark ? 'text-white/15 cursor-default' : 'text-slate-200 cursor-default'
                  : isSelected ? 'text-white shadow-md'
                  : isT ? isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-900 shadow-sm'
                  : isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-white text-slate-600'
                }`}
                style={isSelected && !isFuture ? { background: themeColor } : {}}
              >
                <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${hasSession ? isSelected ? 'bg-white/80' : 'bg-green-400' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={fadeIn.style(1)} className="flex items-center justify-between px-1">
        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {formatDisplayDate(viewDate)}
          {isToday && <span className="text-[10px] font-semibold ml-2 px-2 py-0.5 rounded-full text-white" style={{ background: themeColor }}>Сьогодні</span>}
        </p>
        {sessions.length > 0 && (
          <button onClick={loadPlans} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            + Ще тренування
          </button>
        )}
      </div>

      {saving ? (
        <JournalTabSkeleton isDark={isDark} />
      ) : sessions.length === 0 ? (
        <div style={fadeIn.style(2)} className="space-y-3">
          <div className={`rounded-2xl p-8 flex flex-col items-center gap-3 text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <span className="text-5xl">🏋️</span>
            <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isToday ? 'Сьогодні тренування ще не заплановано' : 'Цього дня не було тренувань'}
            </p>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Обери план і розпочни тренування</p>
            <button onClick={loadPlans} className="mt-1 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: themeColor }}>
              + Додати тренування
            </button>
          </div>
          {showPlanPicker && <PlanPickerSheet plans={plans} isDark={isDark} themeColor={themeColor} onSelect={handleStartFromPlan} onClose={() => setShowPlanPicker(false)} />}
        </div>
      ) : (
        <div style={fadeIn.style(2)} className="space-y-3">
          {showPlanPicker && <PlanPickerSheet plans={plans} isDark={isDark} themeColor={themeColor} onSelect={handleStartFromPlan} onClose={() => setShowPlanPicker(false)} />}
          {sessions.map((session, sIdx) => {
            const statusColor = session.status === 'completed' ? '#10b981' : session.status === 'in_progress' ? '#f59e0b' : themeColor;
            const statusLabel = session.status === 'completed' ? 'Завершено ✓' : session.status === 'in_progress' ? 'В процесі…' : 'Заплановано';
            return (
              <div key={session.id} className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {sessions.length > 1 && <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 ${isDark ? 'text-white/30' : 'text-slate-300'}`}>Тренування {sIdx + 1}</p>}
                      <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{session.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl text-white flex-shrink-0" style={{ background: statusColor }}>{statusLabel}</span>
                  </div>
                  <button onClick={() => openActiveWorkout(session)}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] shadow-md ${session.status === 'completed' ? '' : 'text-white'}`}
                    style={session.status === 'completed' ? { background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' } : { background: themeColor }}
                  >
                    {session.status === 'completed' ? '👁 Переглянути результати' : session.status === 'in_progress' ? '▶ Продовжити тренування' : '▶ Розпочати тренування'}
                  </button>
                </div>
                <div className={`border-t px-4 py-3 ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                  <p className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-white/30' : 'text-slate-300'}`}>Вправи</p>
                  <div className="flex flex-wrap gap-1.5">
                    <ExerciseQuickList sessionId={session.id} isDark={isDark} themeColor={themeColor} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};