import { useState, useEffect } from 'react';
import type { TelegramUser, UserData } from '../types/types';
import supabase from '../supabase/supabase-client';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadialBarChart, RadialBar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Droplet, Dumbbell, User, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatsSectionProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

type Tab = 'nutrition' | 'water' | 'workouts' | 'body';

interface DayStats {
  date: string;
  label: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;
}

interface WorkoutStat {
  date: string;
  label: string;
  volume: number;
  sessions: number;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function last7Days(): string[] {
  const arr: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().split('T')[0]);
  }
  return arr;
}

function last30Days(): string[] {
  const arr: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().split('T')[0]);
  }
  return arr;
}

export const StatsSection = ({ user, isDark, themeColor = '#8b5cf6' }: StatsSectionProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('body');
  const [range, setRange] = useState<'7' | '30'>('7');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const [nutritionData, setNutritionData] = useState<DayStats[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutStat[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('users').select('*').eq('telegram_user_id', user.id).single()
      .then(({ data }) => { if (data) setUserData(data); });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id, activeTab, range]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const days = range === '7' ? last7Days() : last30Days();

      if (activeTab === 'nutrition' || activeTab === 'water') {
        const { data: uData } = await supabase
          .from('users').select('id').eq('telegram_user_id', user.id).single();
        if (!uData) return;

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('date, water_ml')
          .eq('user_id', uData.id)
          .gte('date', days[0])
          .lte('date', days[days.length - 1]);

        const { data: meals } = await supabase
          .from('meals')
          .select('calories, protein, fat, carbs, daily_logs!inner(user_id, date)')
          .eq('daily_logs.user_id', uData.id)
          .gte('daily_logs.date', days[0])
          .lte('daily_logs.date', days[days.length - 1]);

        const statsMap: Record<string, DayStats> = {};
        days.forEach(d => {
          statsMap[d] = { date: d, label: shortDate(d), calories: 0, protein: 0, fat: 0, carbs: 0, water: 0 };
        });

        (meals || []).forEach((m: any) => {
          const d = m.daily_logs?.date;
          if (d && statsMap[d]) {
            statsMap[d].calories += m.calories || 0;
            statsMap[d].protein += m.protein || 0;
            statsMap[d].fat += m.fat || 0;
            statsMap[d].carbs += m.carbs || 0;
          }
        });

        (logs || []).forEach((l: any) => {
          if (statsMap[l.date]) statsMap[l.date].water = l.water_ml || 0;
        });

        setNutritionData(Object.values(statsMap));
      }

      if (activeTab === 'workouts') {
        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('date, id, status')
          .eq('user_id', user.id)
          .gte('date', days[0])
          .lte('date', days[days.length - 1])
          .eq('status', 'completed');

        const sessionIds = (sessions || []).map((s: any) => s.id);
        let volumeByDate: Record<string, number> = {};

        if (sessionIds.length > 0) {
          const { data: sets } = await supabase
            .from('session_sets')
            .select('weight, reps, is_completed, session_exercises!inner(session_id)')
            .in('session_exercises.session_id', sessionIds)
            .eq('is_completed', true);

          const sessionDateMap: Record<number, string> = {};
          (sessions || []).forEach((s: any) => { sessionDateMap[s.id] = s.date; });

          (sets || []).forEach((s: any) => {
            const sessionId = s.session_exercises?.session_id;
            const date = sessionDateMap[sessionId];
            if (date) {
              volumeByDate[date] = (volumeByDate[date] || 0) + (s.weight || 0) * (s.reps || 0);
            }
          });
        }

        const sessionsPerDay: Record<string, number> = {};
        (sessions || []).forEach((s: any) => {
          sessionsPerDay[s.date] = (sessionsPerDay[s.date] || 0) + 1;
        });

        const wData: WorkoutStat[] = days.map(d => ({
          date: d,
          label: shortDate(d),
          volume: Math.round(volumeByDate[d] || 0),
          sessions: sessionsPerDay[d] || 0,
        }));
        setWorkoutData(wData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const avgCalories = nutritionData.length
    ? Math.round(nutritionData.reduce((s, d) => s + d.calories, 0) / (nutritionData.filter(d => d.calories > 0).length || 1))
    : 0;

  const avgWater = nutritionData.length
    ? Math.round(nutritionData.reduce((s, d) => s + d.water, 0) / (nutritionData.filter(d => d.water > 0).length || 1))
    : 0;

  const totalWorkouts = workoutData.filter(d => d.sessions > 0).length;
  const totalVolume = workoutData.reduce((s, d) => s + d.volume, 0);

  const tdee = userData?.TDEE || 2000;
  const targetWater = userData?.waterPerDay || 2500;

  const tc = themeColor;
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? 'rgba(255,255,255,0.35)' : '#a1a1aa';

  const cardBg = isDark ? 'bg-zinc-900/40 border-white/5 shadow-sm' : 'bg-white border-zinc-100 shadow-sm';
  const textMuted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const textMain = isDark ? 'text-zinc-100' : 'text-zinc-900';

  const CustomTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`px-3 py-2 rounded-xl shadow-xl text-xs backdrop-blur-md ${isDark ? 'bg-zinc-800/90 border border-white/10 text-white' : 'bg-white/90 border border-zinc-100 text-zinc-800'}`}>
        <p className="font-bold mb-1 tracking-tight">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: <b>{p.value}</b></p>
        ))}
      </div>
    );
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'body', label: t('stats.tabs.body'), icon: <User size={14} /> },
    { id: 'nutrition', label: t('stats.tabs.nutrition'), icon: <Utensils size={14} /> },
    { id: 'workouts', label: t('stats.tabs.workouts'), icon: <Dumbbell size={14} /> },
    { id: 'water', label: t('stats.tabs.water'), icon: <Droplet size={14} /> },
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${tc}40, transparent)` }} />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t('stats.analytics')}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${tc}40, transparent)` }} />
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-2xl overflow-x-auto ${isDark ? 'bg-zinc-900/60 border border-white/5' : 'bg-zinc-100 border border-zinc-200/50'}`}
        style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-300 ${
                isActive ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStatsTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: tc }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab !== 'body' && (
        <div className="flex justify-end">
          <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'}`}>
            {(['7', '30'] as const).map(r => {
              const isActive = range === r;
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`relative px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    isActive ? 'text-white' : isDark ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  {isActive && (
                    <motion.div layoutId="activeRange" className="absolute inset-0 rounded-lg shadow-sm" style={{ backgroundColor: tc }} />
                  )}
                  <span className="relative z-10">{r === '7' ? t('stats.days_7') : t('stats.days_30')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-10"
          >
            <Activity className="w-6 h-6 animate-spin" style={{ color: tc }} />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab + range}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {activeTab === 'nutrition' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-2xl p-4 border ${cardBg}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>{t('stats.avg_calories')}</p>
                    <p className={`text-3xl font-black mt-1 tracking-tighter ${textMain}`}>{avgCalories || '—'}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${textMuted}`}>{t('stats.goal_kcal', { tdee })}</p>
                    <div className={`mt-3 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`}>
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min((avgCalories / tdee) * 100, 100)}%` }} transition={{ duration: 1 }} style={{ background: tc }} />
                    </div>
                  </div>
                  <div className={`rounded-2xl p-4 border ${cardBg}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>{t('stats.active_days')}</p>
                    <p className={`text-3xl font-black mt-1 tracking-tighter ${textMain}`}>{nutritionData.filter(d => d.calories > 0).length}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${textMuted}`}>{t('stats.out_of_days', { total: nutritionData.length })}</p>
                    <div className={`mt-3 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`}>
                      <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(nutritionData.filter(d => d.calories > 0).length / nutritionData.length) * 100}%` }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl p-4 border ${cardBg}`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-xs font-bold ${textMain}`}>{t('stats.calorie_trend')}</p>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={nutritionData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={tc} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={tc} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTip />} cursor={{ stroke: gridColor, strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="calories" stroke={tc} strokeWidth={3}
                        fill="url(#calGrad)" dot={{ fill: tc, r: 4, strokeWidth: 2, stroke: isDark ? '#18181b' : '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }} name={t('stats.kcal')} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className={`rounded-2xl p-4 border ${cardBg}`}>
                  <p className={`text-xs font-bold mb-4 ${textMain}`}>{t('stats.macros_g')}</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={nutritionData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }} barSize={range === '7' ? 12 : 6}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="protein" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name={t('stats.protein')} />
                      <Bar dataKey="fat" stackId="a" fill="#f59e0b" name={t('stats.fat')} />
                      <Bar dataKey="carbs" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('stats.carbs')} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 justify-center">
                    {[['#10b981', t('stats.protein')], ['#f59e0b', t('stats.fat')], ['#3b82f6', t('stats.carbs')]].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: color }} />
                        <span className={`text-[10px] font-semibold ${textMuted}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'water' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-2xl p-4 border ${cardBg}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>{t('stats.avg_per_day')}</p>
                    <p className={`text-3xl font-black mt-1 tracking-tighter ${textMain}`}>{avgWater ? (avgWater / 1000).toFixed(1) : '—'}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${textMuted}`}>{t('stats.goal_l', { target: (targetWater / 1000).toFixed(1) })}</p>
                    <div className={`mt-3 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`}>
                      <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${Math.min((avgWater / targetWater) * 100, 100)}%` }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                  <div className={`rounded-2xl p-4 border ${cardBg}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>{t('stats.goal_reached')}</p>
                    <p className={`text-3xl font-black mt-1 tracking-tighter ${textMain}`}>
                      {nutritionData.filter(d => d.water >= targetWater * 0.9).length}
                    </p>
                    <p className={`text-[10px] mt-0.5 font-medium ${textMuted}`}>
                      {t('stats.out_of_active', { active: nutritionData.filter(d => d.water > 0).length })}
                    </p>
                  </div>
                </div>

                <div className={`rounded-2xl p-4 border ${cardBg}`}>
                  <p className={`text-xs font-bold mb-4 ${textMain}`}>{t('stats.water_by_days')}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={nutritionData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTip />} cursor={{ stroke: gridColor, strokeWidth: 2 }} />
                      <Area type="step" dataKey="water" stroke="#3b82f6" strokeWidth={3}
                        fill="url(#waterGrad)" dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: isDark ? '#18181b' : '#fff' }} name={t('main.ml')} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {activeTab === 'workouts' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t('stats.workouts_count'), value: totalWorkouts, sub: t('stats.out_of_days', { total: workoutData.length }) },
                    { label: t('stats.volume'), value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}т` : '—', sub: t('stats.volume_total') },
                    { label: t('stats.activity_pct'), value: `${Math.round((totalWorkouts / workoutData.length) * 100)}%`, sub: t('stats.days_pct') },
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-2xl p-4 border text-center ${cardBg}`}>
                      <p className={`text-2xl font-black tracking-tighter ${textMain}`}>{stat.value}</p>
                      <p className={`text-[9px] uppercase font-bold tracking-widest mt-1 ${textMuted}`}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className={`rounded-2xl p-4 border ${cardBg}`}>
                  <p className={`text-xs font-bold mb-4 ${textMain}`}>{t('stats.workout_volume_kg')}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={workoutData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }} barSize={range === '7' ? 16 : 8}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: tickColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="volume" fill={tc} radius={[4, 4, 0, 0]} name={t('stats.workout_volume_kg')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {activeTab === 'body' && userData && (
              <>
                <div className={`rounded-2xl p-5 border ${cardBg}`}>
                  <p className={`text-xs font-bold mb-4 ${textMain}`}>{t('stats.bmi_title')}</p>
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%"
                          startAngle={180} endAngle={0}
                          data={[{ value: Math.min(((userData.BMI - 15) / (40 - 15)) * 100, 100), fill: tc }]}
                        >
                          <RadialBar dataKey="value" cornerRadius={10} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 16 }}>
                        <span className={`text-3xl font-black tracking-tighter ${textMain}`}>{userData.BMI}</span>
                        <span className={`text-[10px] font-semibold tracking-widest uppercase ${textMuted}`}>BMI</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>{t('stats.category')}</p>
                        <p className={`text-sm font-bold ${userData.BMI >= 25 ? 'text-orange-500' : userData.BMI < 18.5 ? 'text-blue-500' : 'text-emerald-500'}`}>
                          {userData.BMI < 18.5 ? t('stats.bmi.underweight') : userData.BMI < 25 ? t('stats.bmi.normal') : userData.BMI < 30 ? t('stats.bmi.overweight') : t('stats.bmi.obesity')}
                        </p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>{t('stats.ideal_weight')}</p>
                        <p className={`text-sm font-bold ${textMain}`}>
                          ~{Math.round(22 * Math.pow((userData.height || 170) / 100, 2))} {t('results.kg')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl p-5 border ${cardBg}`}>
                  <p className={`text-xs font-bold mb-4 ${textMain}`}>{t('stats.target_macros')}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: t('stats.protein'), value: userData.protein, unit: t('stats.g'), color: '#10b981', cal: userData.protein * 4 },
                      { label: t('stats.fat'), value: userData.fat, unit: t('stats.g'), color: '#f59e0b', cal: userData.fat * 9 },
                      { label: t('stats.carbs'), value: userData.carbs, unit: t('stats.g'), color: '#3b82f6', cal: userData.carbs * 4 },
                    ].map(m => (
                      <div key={m.label} className={`rounded-2xl p-3 border ${isDark ? 'bg-zinc-800/30 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                        <div className="w-8 h-1 rounded-full mx-auto mb-2" style={{ background: m.color }} />
                        <p className={`text-xl font-black tracking-tighter ${textMain}`}>{m.value}</p>
                        <p className={`text-[10px] font-medium ${textMuted}`}>{m.unit}</p>
                        <p className={`text-[10px] font-bold mt-1`} style={{ color: m.color }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};