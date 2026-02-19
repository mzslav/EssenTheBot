import { useState, useEffect, useRef } from 'react';
import type { TelegramUser } from '../types/types';
import supabase from '../supabase/supabase-client';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadialBarChart, RadialBar
} from 'recharts';

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
  const [activeTab, setActiveTab] = useState<Tab>('nutrition');
  const [range, setRange] = useState<'7' | '30'>('7');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const [nutritionData, setNutritionData] = useState<DayStats[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutStat[]>([]);

  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

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
    ? Math.round(nutritionData.reduce((s, d) => s + d.calories, 0) / nutritionData.filter(d => d.calories > 0).length || 0)
    : 0;

  const avgWater = nutritionData.length
    ? Math.round(nutritionData.reduce((s, d) => s + d.water, 0) / nutritionData.filter(d => d.water > 0).length || 0)
    : 0;

  const totalWorkouts = workoutData.filter(d => d.sessions > 0).length;
  const totalVolume = workoutData.reduce((s, d) => s + d.volume, 0);

  const tdee = userData?.TDEE || 2000;
  const targetWater = userData?.waterPerDay || 2500;

  const tc = themeColor;
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8';

  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm';
  const textMuted = isDark ? 'text-white/50' : 'text-slate-400';
  const textMain = isDark ? 'text-white' : 'text-slate-900';

  const CustomTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`px-3 py-2 rounded-xl shadow-xl text-xs ${isDark ? 'bg-slate-800 border border-white/10 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></p>
        ))}
      </div>
    );
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'nutrition', label: 'Харчування', icon: '🥗' },
    { id: 'water', label: 'Вода', icon: '💧' },
    { id: 'workouts', label: 'Тренування', icon: '🏋️' },
    { id: 'body', label: 'Тіло', icon: '⚖️' },
  ];

  return (
    <div
      ref={sectionRef}
      className="mt-6 space-y-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${tc}40, transparent)` }} />
        <span className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>Статистика</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${tc}40, transparent)` }} />
      </div>

      <div className={`flex gap-1 p-1 rounded-2xl overflow-x-auto ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}
        style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${
              activeTab === tab.id
                ? 'text-white shadow-lg'
                : isDark ? 'text-white/50 hover:text-white/70' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={activeTab === tab.id ? { background: tc } : {}}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab !== 'body' && (
        <div className="flex justify-end">
          <div className={`flex gap-0.5 p-0.5 rounded-xl ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            {(['7', '30'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  range === r
                    ? 'text-white shadow'
                    : isDark ? 'text-white/40' : 'text-slate-400'
                }`}
                style={range === r ? { background: tc } : {}}
              >
                {r === '7' ? '7 днів' : '30 днів'}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${tc}40`, borderTopColor: tc }} />
        </div>
      ) : (
        <>
          {activeTab === 'nutrition' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-2xl p-3.5 border ${cardBg}`}>
                  <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>Середні калорії</p>
                  <p className={`text-2xl font-black mt-1 ${textMain}`}>{avgCalories || '—'}</p>
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>ціль: {tdee} ккал</p>
                  <div className={`mt-2 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((avgCalories / tdee) * 100, 100)}%`, background: tc }} />
                  </div>
                </div>
                <div className={`rounded-2xl p-3.5 border ${cardBg}`}>
                  <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>Активних днів</p>
                  <p className={`text-2xl font-black mt-1 ${textMain}`}>{nutritionData.filter(d => d.calories > 0).length}</p>
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>з {nutritionData.length} днів</p>
                  <div className={`mt-2 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-full rounded-full" style={{
                      width: `${(nutritionData.filter(d => d.calories > 0).length / nutritionData.length) * 100}%`,
                      background: '#10b981'
                    }} />
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-semibold ${textMain}`}>Калорії по днях</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'} ${textMuted}`}>ккал</span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={nutritionData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tc} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={tc} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTip />} />
                    <Area type="monotone" dataKey="calories" stroke={tc} strokeWidth={2.5}
                      fill="url(#calGrad)" dot={{ fill: tc, r: 3, strokeWidth: 0 }}
                      name="ккал" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${textMain}`}>Макронутрієнти (г)</p>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={nutritionData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }} barSize={range === '7' ? 18 : 8}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTip />} />
                    <Bar dataKey="protein" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Білки" />
                    <Bar dataKey="fat" stackId="a" fill="#f59e0b" name="Жири" />
                    <Bar dataKey="carbs" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Вуглеводи" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-3 mt-2 justify-center">
                  {[['#10b981', 'Білки'], ['#f59e0b', 'Жири'], ['#3b82f6', 'Вуглеводи']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className={`text-[9px] ${textMuted}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'water' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-2xl p-3.5 border ${cardBg}`}>
                  <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>Середньо/день</p>
                  <p className={`text-2xl font-black mt-1 ${textMain}`}>{avgWater ? (avgWater / 1000).toFixed(1) : '—'}</p>
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>л · ціль: {(targetWater / 1000).toFixed(1)} л</p>
                  <div className={`mt-2 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min((avgWater / targetWater) * 100, 100)}%`, background: '#3b82f6' }} />
                  </div>
                </div>
                <div className={`rounded-2xl p-3.5 border ${cardBg}`}>
                  <p className={`text-[9px] uppercase tracking-widest font-semibold ${textMuted}`}>Ціль досягнута</p>
                  <p className={`text-2xl font-black mt-1 ${textMain}`}>
                    {nutritionData.filter(d => d.water >= targetWater * 0.9).length}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>
                    з {nutritionData.filter(d => d.water > 0).length} активних
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-semibold ${textMain}`}>Вода по днях</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'} ${textMuted}`}>мл</span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={nutritionData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTip />} />
                    <Area type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={2.5}
                      fill="url(#waterGrad)" dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} name="мл" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className={`rounded-2xl overflow-hidden border ${cardBg}`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <p className={`text-xs font-semibold ${textMain}`}>Деталі по днях</p>
                </div>
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {[...nutritionData].reverse().filter(d => d.water > 0).map((d, i) => {
                    const pct = Math.min((d.water / targetWater) * 100, 100);
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                        <p className={`text-xs font-medium w-16 flex-shrink-0 ${textMuted}`}>{d.label}</p>
                        <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 90 ? '#10b981' : '#3b82f6' }} />
                        </div>
                        <p className={`text-xs font-bold w-14 text-right flex-shrink-0 ${textMain}`}>
                          {(d.water / 1000).toFixed(1)} л
                        </p>
                        {pct >= 90 && <span className="text-sm">✅</span>}
                      </div>
                    );
                  })}
                  {nutritionData.filter(d => d.water > 0).length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className={`text-xs ${textMuted}`}>Ще немає даних</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workouts' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Тренувань', value: totalWorkouts, sub: `з ${workoutData.length} днів` },
                  { label: 'Об\'єм', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}т` : '—', sub: 'загальний' },
                  { label: 'Активність', value: `${Math.round((totalWorkouts / workoutData.length) * 100)}%`, sub: 'днів' },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-2xl p-3 border text-center ${cardBg}`}>
                    <p className={`text-xl font-black ${textMain}`}>{stat.value}</p>
                    <p className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 ${textMuted}`}>{stat.label}</p>
                    <p className={`text-[9px] ${textMuted} mt-0.5`}>{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${textMain}`}>Об'єм тренувань (кг)</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={workoutData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }} barSize={range === '7' ? 20 : 9}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTip />} />
                    <Bar dataKey="volume" fill={tc} radius={[4, 4, 0, 0]} name="Об'єм (кг)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {range === '7' && (
                <div className={`rounded-2xl p-4 border ${cardBg}`}>
                  <p className={`text-xs font-semibold mb-3 ${textMain}`}>Активність цього тижня</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {workoutData.map((d, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all"
                          style={{
                            background: d.sessions > 0 ? `${tc}${d.sessions > 1 ? 'ff' : '80'}` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            color: d.sessions > 0 ? 'white' : tickColor,
                          }}
                        >
                          {d.sessions > 0 ? '🏋️' : ''}
                        </div>
                        <span style={{ fontSize: 9, color: tickColor }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'body' && userData && (
            <div className="space-y-3">
              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${textMain}`}>Індекс маси тіла (BMI)</p>
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="85%"
                        startAngle={180} endAngle={0}
                        data={[{ value: Math.min(((userData.BMI - 15) / (40 - 15)) * 100, 100), fill: tc }]}
                      >
                        <RadialBar dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 16 }}>
                      <span className={`text-2xl font-black ${textMain}`}>{userData.BMI}</span>
                      <span className={`text-[9px] ${textMuted}`}>BMI</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className={`text-[10px] ${textMuted}`}>Категорія</p>
                      <p className={`text-sm font-bold ${userData.BMI >= 25 ? 'text-orange-500' : userData.BMI < 18.5 ? 'text-blue-500' : 'text-emerald-500'}`}>
                        {userData.BMICategory}
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${textMuted}`}>Ідеальна вага</p>
                      <p className={`text-sm font-bold ${textMain}`}>
                        ~{Math.round(22 * Math.pow(userData.height / 100, 2))} кг
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${textMuted}`}>Поточна</p>
                      <p className={`text-sm font-bold ${textMain}`}>{userData.weight} кг</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${textMain}`}>Розподіл калорій</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'BMR (базовий метаболізм)', value: Math.round(userData.TDEE_Normal / (userData.multiplier || 1.2)), max: userData.TDEE_Normal, color: '#6366f1' },
                    { label: 'TDEE (з активністю)', value: userData.TDEE_Normal, max: userData.TDEE_Normal, color: tc },
                    { label: 'Ціль (з коригуванням)', value: userData.TDEE, max: userData.TDEE_Normal, color: '#10b981' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-[10px] ${textMuted}`}>{item.label}</span>
                        <span className={`text-[10px] font-bold ${textMain}`}>{item.value} ккал</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <div className="h-full rounded-full" style={{ width: `${(item.value / item.max) * 100}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${textMain}`}>Цільові макронутрієнти</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Білки', value: userData.protein, unit: 'г', color: '#10b981', cal: userData.protein * 4 },
                    { label: 'Жири', value: userData.fat, unit: 'г', color: '#f59e0b', cal: userData.fat * 9 },
                    { label: 'Вуглеводи', value: userData.carbs, unit: 'г', color: '#3b82f6', cal: userData.carbs * 4 },
                  ].map(m => (
                    <div key={m.label} className={`rounded-xl p-2.5 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <div className="w-6 h-1 rounded-full mx-auto mb-2" style={{ background: m.color }} />
                      <p className={`text-lg font-black ${textMain}`}>{m.value}</p>
                      <p className={`text-[9px] ${textMuted}`}>{m.unit}</p>
                      <p className={`text-[9px] mt-1 ${textMuted}`}>{m.cal} ккал</p>
                      <p className={`text-[10px] font-semibold mt-0.5`} style={{ color: m.color }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl p-4 border ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${textMain}`}>Фізичні параметри</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Вік', value: `${userData.age} р.` },
                    { label: 'Зріст', value: `${userData.height} см` },
                    { label: 'Вага', value: `${userData.weight} кг` },
                    { label: 'Стать', value: userData.gender?.includes('Жінка') ? '👩 Жінка' : '👨 Чоловік' },
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <p className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{stat.label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${textMain}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};