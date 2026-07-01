import { useState, useEffect } from 'react';
import type { ExerciseLibraryItem, TelegramUser, ProgressEntry } from '../../types/types';
import { ProgressTabSkeleton } from '../../components/Skeleton';
import { useFadeIn } from '../../utils/useFadeIn';
import { getExerciseHistory, searchExerciseLibrary } from '../../utils/workoutService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Activity, BarChart2, Dumbbell, History, LineChart as LineChartIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProgressTabProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

type ProgressMetric = 'max_weight' | 'total_volume' | 'total_reps';

export const ProgressTab = ({ user, isDark, themeColor = '#8b5cf6' }: ProgressTabProps) => {
  const { t } = useTranslation();

  const METRIC_LABELS: Record<ProgressMetric, string> = {
    max_weight: t('workout.progress_tab.max_weight', 'Макс. вага (кг)'),
    total_volume: t('workout.progress_tab.total_volume', 'Об\'єм (кг)'),
    total_reps: t('workout.progress_tab.total_reps', 'Повторення'),
  };

  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [metric, setMetric] = useState<ProgressMetric>('max_weight');
  const [loading, setLoading] = useState(false);
  const [exercisesLoading, setExercisesLoading] = useState(true);

  const fadeIn = useFadeIn(!exercisesLoading);
  const dataFadeIn = useFadeIn(!loading && history.length > 0);

  useEffect(() => {
    if (!user?.id) return;
    setExercisesLoading(true);
    searchExerciseLibrary(user.id, query)
      .then(setExercises)
      .catch(console.error)
      .finally(() => setExercisesLoading(false));
  }, [query, user?.id]);

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

  const selectClass = `w-full px-4 py-3.5 rounded-2xl text-sm font-bold appearance-none outline-none transition-all border ${isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-300 shadow-sm'}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`px-4 py-3 rounded-2xl shadow-xl text-xs border ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
        <p className={`font-bold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</p>
        <p className="font-black text-sm flex items-center gap-1.5" style={{ color: themeColor }}>
          <Activity size={14} /> {METRIC_LABELS[metric]}: {payload[0].value}
        </p>
      </div>
    );
  };

  if (exercisesLoading) return <ProgressTabSkeleton isDark={isDark} />;

  return (
    <div className="space-y-4 pb-20">

      <div style={fadeIn.style(0)} className={`rounded-3xl p-5 border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-sm'}`}>
        <div className="space-y-4">
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{t('workout.progress_tab.search_exercise', 'Знайди вправу')}</label>
            <div className="relative">
              <input
                className={selectClass}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('workout.progress_tab.search_placeholder', 'Наприклад: жим, присідання...')}
              />
            </div>
          </div>

          {exercises.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{t('workout.progress_tab.choose_exercise', 'Обери вправу')}</label>
              <div className="relative">
                <select className={selectClass} value={selectedExerciseId ?? ''} onChange={e => handleSelectExercise(Number(e.target.value))}>
                  <option value="">{t('workout.progress_tab.choose_exercise_placeholder', 'Обери вправу…')}</option>
                  {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  ▼
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {loading ? (
        <ProgressTabSkeleton isDark={isDark} />
      ) : selectedExerciseId && history.length === 0 ? (
        <div style={fadeIn.style(2)} className={`rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-dashed ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
            <TrendingUp size={28} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          </div>
          <p className={`font-bold text-lg mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t('workout.progress_tab.no_data', 'Немає даних')}</p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{t('workout.progress_tab.no_data_desc', 'Виконай цю вправу хоча б один раз на тренуванні, щоб побачити графік.')}</p>
        </div>
      ) : history.length > 0 ? (
        <>
          <div style={dataFadeIn.style(0)} className="grid grid-cols-3 gap-2">
            {[
              { label: t('workout.progress_tab.workouts', 'Тренувань'), value: totalSessions, icon: <History size={14} /> },
              { label: t('workout.progress_tab.max_weight_short', 'Макс. вага'), value: `${bestWeight} ${t('workout.progress_tab.kg_tag', 'кг')}`, icon: <Dumbbell size={14} /> },
              { label: t('workout.progress_tab.max_volume', 'Макс. об\'єм'), value: `${bestVolume} ${t('workout.progress_tab.kg_tag', 'кг')}`, icon: <BarChart2 size={14} /> },
            ].map(stat => (
              <div key={stat.label} className={`rounded-3xl p-4 flex flex-col items-center justify-center text-center border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className={`p-1.5 rounded-lg mb-2 ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                  {stat.icon}
                </div>
                <p className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{stat.value}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={dataFadeIn.style(1)} className={`rounded-2xl p-1.5 flex gap-1.5 border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            {(Object.keys(METRIC_LABELS) as ProgressMetric[]).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${metric === m ? 'text-white shadow-md' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                style={metric === m ? { background: themeColor } : {}}>
                {m === 'max_weight' ? t('workout.progress_tab.max_weight_short', 'Макс. вага') : m === 'total_volume' ? t('workout.progress_tab.total_volume_short', "Загальний об'єм") : t('workout.progress_tab.all_reps', 'Всі повтори')}
              </button>
            ))}
          </div>

          <div style={dataFadeIn.style(2)} className={`rounded-3xl p-5 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-6">
              <LineChartIcon size={18} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
              <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {selectedExercise?.name}: {METRIC_LABELS[metric]}
              </p>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 10, fill: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 2 }} />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={themeColor}
                  strokeWidth={3.5}
                  dot={{ fill: isDark ? '#18181b' : '#ffffff', stroke: themeColor, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: themeColor, stroke: isDark ? '#18181b' : '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={dataFadeIn.style(3)} className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <div className={`px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.progress_tab.history', 'Історія результатів')}</p>
            </div>
            <div className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
              {[...history].reverse().map((entry, i) => (
                <div key={i} className={`px-5 py-3.5 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                      <History size={14} />
                    </div>
                    <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{new Date(entry.date).toLocaleDateString('uk-UA')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-[11px] font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{entry.max_weight} {t('workout.progress_tab.kg_tag', 'кг')} <span className="font-normal opacity-50 text-[10px]">{t('workout.progress_tab.max_tag', 'макс')}</span></span>
                    <span className={`text-[10px] font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{entry.total_reps} {t('workout.progress_tab.reps_tag', 'повт')} · {entry.total_volume} {t('workout.progress_tab.kg_tag', 'кг')} {t('workout.progress_tab.volume_tag', 'об\'єм')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        !selectedExerciseId && (
          <div style={fadeIn.style(2)} className={`rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-dashed ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
              <LineChartIcon size={28} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
            </div>
            <p className={`font-bold text-lg mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t('workout.progress_tab.choose_exercise', 'Обери вправу')}</p>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{t('workout.progress_tab.choose_exercise_desc', 'Вибери план і вправу вище, щоб побачити графік та історію прогресу.')}</p>
          </div>
        )
      )}
    </div>
  );
};
