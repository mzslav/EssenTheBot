import { useState, useEffect } from 'react';
import type { TelegramUser, WorkoutPlan, PlanExercise, ProgressEntry } from '../../types/types';
import { ProgressTabSkeleton } from '../../components/Skeleton';
import { useFadeIn } from '../../utils/useFadeIn';
import { getPlans, getPlanExercises, getExerciseHistory } from '../../utils/workoutService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ProgressTabProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

type ProgressMetric = 'max_weight' | 'total_volume' | 'total_reps';

const METRIC_LABELS: Record<ProgressMetric, string> = {
  max_weight: 'Макс. вага (кг)',
  total_volume: "Об'єм (кг)",
  total_reps: 'Повторення',
};

export const ProgressTab = ({ user, isDark, themeColor = '#8b5cf6' }: ProgressTabProps) => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [metric, setMetric] = useState<ProgressMetric>('max_weight');
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);

  const fadeIn = useFadeIn(!plansLoading);
  const dataFadeIn = useFadeIn(!loading && history.length > 0);

  useEffect(() => {
    if (!user?.id) return;
    getPlans(user.id).then(data => { setPlans(data); setPlansLoading(false); });
  }, [user?.id]);

  const handleSelectPlan = async (planId: number) => {
    setSelectedPlanId(planId);
    setSelectedExerciseId(null);
    setHistory([]);
    const exs = await getPlanExercises(planId);
    setExercises(exs);
  };

  const handleSelectExercise = async (exerciseId: number) => {
    setSelectedExerciseId(exerciseId);
    setLoading(true);
    try {
      const data = await getExerciseHistory(exerciseId);
      setHistory(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}`;
  };

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId);
  const bestWeight = history.length ? Math.max(...history.map(h => h.max_weight)) : 0;
  const bestVolume = history.length ? Math.max(...history.map(h => h.total_volume)) : 0;
  const totalSessions = history.length;

  const selectClass = `w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`px-3 py-2 rounded-xl shadow-lg text-xs ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border border-slate-100'}`}>
        <p className="font-semibold mb-1">{label}</p>
        <p style={{ color: themeColor }}>{METRIC_LABELS[metric]}: <b>{payload[0].value}</b></p>
      </div>
    );
  };

  if (plansLoading) return <ProgressTabSkeleton isDark={isDark} />;

  return (
    <div className="space-y-3">
      <div style={fadeIn.style(0)}>
        <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>План</label>
        <select className={selectClass} value={selectedPlanId ?? ''} onChange={e => handleSelectPlan(Number(e.target.value))}>
          <option value="">Обери план…</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedPlanId && exercises.length > 0 && (
        <div style={fadeIn.style(1)}>
          <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Вправа</label>
          <select className={selectClass} value={selectedExerciseId ?? ''} onChange={e => handleSelectExercise(Number(e.target.value))}>
            <option value="">Обери вправу…</option>
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <ProgressTabSkeleton isDark={isDark} />
      ) : selectedExerciseId && history.length === 0 ? (
        <div style={fadeIn.style(2)} className={`rounded-2xl p-8 text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <span className="text-4xl block mb-3">📉</span>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Немає даних. Виконай хоча б одне тренування!</p>
        </div>
      ) : history.length > 0 ? (
        <>
          <div style={dataFadeIn.style(0)} className="grid grid-cols-3 gap-2">
            {[
              { label: 'Тренувань', value: totalSessions },
              { label: 'Макс. вага', value: `${bestWeight} кг` },
              { label: "Макс. об'єм", value: `${bestVolume} кг` },
            ].map(stat => (
              <div key={stat.label} className={`rounded-2xl p-3 text-center ${isDark ? 'bg-white/5' : 'bg-white border border-slate-100 shadow-sm'}`}>
                <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={dataFadeIn.style(1)} className={`rounded-xl p-1 flex gap-1 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            {(Object.keys(METRIC_LABELS) as ProgressMetric[]).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${metric === m ? 'text-white' : isDark ? 'text-white/50' : 'text-slate-500'}`}
                style={metric === m ? { background: themeColor } : {}}>
                {m === 'max_weight' ? 'Вага' : m === 'total_volume' ? "Об'єм" : 'Повт'}
              </button>
            ))}
          </div>

          <div style={dataFadeIn.style(2)} className={`rounded-2xl p-4 ${isDark ? 'bg-white/5' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              {selectedExercise?.name} — {METRIC_LABELS[metric]}
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey={metric} stroke={themeColor} strokeWidth={2.5}
                  dot={{ fill: themeColor, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: themeColor }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={dataFadeIn.style(3)} className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Історія</p>
            </div>
            <div className="divide-y divide-white/5">
              {[...history].reverse().map((entry, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <p className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{new Date(entry.date).toLocaleDateString('uk-UA')}</p>
                  <div className="flex gap-3">
                    <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{entry.max_weight} кг</span>
                    <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{entry.total_reps} повт</span>
                    <span className={`text-[10px] font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{entry.total_volume} кг</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        !selectedExerciseId && (
          <div style={fadeIn.style(2)} className={`rounded-2xl p-8 text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <span className="text-4xl block mb-3">📈</span>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Обери план та вправу щоб побачити прогрес</p>
          </div>
        )
      )}
    </div>
  );
};