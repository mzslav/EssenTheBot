import { useEffect, useState, useCallback } from 'react';
import type { TelegramUser, UserData } from '../types/types';
import supabase from '../supabase/supabase-client';
import { getTotalsByDate, getWaterByDate, updateTodayWater } from '../utils/supabaseService';
import { StatsSection } from '../components/StatsSection';
import { MainScreenSkeleton } from '../components/Skeleton';
import { WeeklyReport } from '../components/WeeklyReport';
import { Droplet, Flame, Target, ChevronLeft, ChevronRight, Activity, BarChart2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface MainScreenProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

function getActivityLabel(multiplier: number): string {
  if (multiplier >= 1.725) return 'Висока активність';
  if (multiplier >= 1.55) return 'Середня активність';
  if (multiplier >= 1.375) return 'Легка активність';
  return 'Малорухливий';
}

function getGoalLabel(goalStr: string): string {
  if (!goalStr) return 'Підтримка ваги';
  if (goalStr.includes('Схуднути') || goalStr.includes('Схуднення')) return 'Схуднення';
  if (goalStr.includes('Набрати') || goalStr.includes('Набір')) return 'Набір маси';
  return 'Підтримка ваги';
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

function formatDisplayDate(date: Date): string {
  const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
  const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export const MainScreen = ({ user, isDark, themeColor = '#8b5cf6' }: MainScreenProps) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState<Date>(todayDate);

  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [waterConsumed, setWaterConsumed] = useState(0);

  const isToday = toDateStr(viewDate) === toDateStr(todayDate);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('*')
      .eq('telegram_user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data) setUserData(data);
        if (error) console.error(error);
        setLoading(false);
      });
  }, [user?.id]);

  const loadDayData = useCallback(async () => {
    if (!user?.id) return;
    const dateStr = toDateStr(viewDate);
    try {
      const [totals, water] = await Promise.all([
        getTotalsByDate(user.id, dateStr),
        getWaterByDate(user.id, dateStr),
      ]);
      setCalories(totals.calories);
      setProtein(totals.protein);
      setFat(totals.fat);
      setCarbs(totals.carbs);
      setWaterConsumed(water);
    } catch (e) {
      console.error(e);
    }
  }, [user?.id, viewDate]);

  useEffect(() => {
    if (!loading) loadDayData();
  }, [loadDayData, loading]);

  const goBack = () => setViewDate(prev => addDays(prev, -1));
  const goForward = () => { if (!isToday) setViewDate(prev => addDays(prev, 1)); };

  const handleAddWater = async (amount: number) => {
    if (!user?.id || !userData || !isToday) return;
    const maxWater = userData.waterPerDay || 3000;
    const next = Math.min(waterConsumed + amount, maxWater);
    setWaterConsumed(next);
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
      await updateTodayWater(user.id, next);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <MainScreenSkeleton isDark={isDark} />;
  if (!userData) return <div className="text-center p-8 opacity-50">Дані відсутні, збережи профіль перед початком використання додатку</div>;

  const tdee = userData.TDEE || 2000;
  const targetProt = userData.protein || 100;
  const targetFat = userData.fat || 60;
  const targetCarbs = userData.carbs || 250;
  const targetWater = userData.waterPerDay || 2500;
  const bmr = Math.round(userData.TDEE_Normal / (userData.multiplier || 1.2));
  const calPct = Math.min((calories / tdee) * 100, 100);
  const waterPct = Math.min((waterConsumed / targetWater) * 100, 100);

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

  const MacroRing = ({ label, consumed, target, color, delay }: { label: string; consumed: number; target: number; color: string; delay: number }) => {
    const pct = Math.min((consumed / Math.max(target, 1)) * 100, 100);
    const radius = 24;
    const circ = 2 * Math.PI * radius;
    const strokePct = ((100 - pct) * circ) / 100;

    return (
      <div className={`flex flex-col items-center justify-center p-3 rounded-2xl ${isDark ? 'bg-zinc-900/50' : 'bg-white'} border ${isDark ? 'border-white/5' : 'border-zinc-100'} shadow-sm`}>
        <div className="relative w-14 h-14 mb-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="28" cy="28" r={radius} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="4" fill="none" />
            <motion.circle
              cx="28" cy="28" r={radius}
              stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: strokePct }}
              transition={{ duration: 1, delay: 0.2 + delay, ease: "easeOut" }}
              strokeDasharray={circ}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{consumed}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold tracking-wide uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-md pb-8 space-y-4 px-3"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center pt-2">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Привіт, {userData.first_name || 'Користувач'}
            {userData.streak_days && userData.streak_days > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold tracking-normal flex items-center gap-1">
                <Flame size={12} strokeWidth={3} /> {userData.streak_days}
              </span>
            ) : null}
          </h1>
          <p className={`text-xs mt-0.5 font-medium flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            <Target size={12} /> {getGoalLabel(userData.goal || '')}
          </p>
        </div>
        <button
          onClick={() => setShowReport(!showReport)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.96] ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          <BarChart2 size={14} /> Звіт
        </button>
      </motion.div>

      <AnimatePresence>
        {showReport && (
          <WeeklyReport user={user} isDark={isDark} themeColor={themeColor} onClose={() => setShowReport(false)} />
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className={`rounded-2xl p-2 flex items-center justify-between border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <button
          onClick={goBack}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-600'}`}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center flex-1">
          <p className={`text-sm font-semibold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{formatDisplayDate(viewDate)}</p>
          {isToday && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: themeColor, backgroundColor: `${themeColor}15` }}>
              Сьогодні
            </span>
          )}
        </div>
        <button
          onClick={goForward}
          disabled={isToday}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isToday
              ? 'opacity-30 cursor-not-allowed'
              : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
        >
          <ChevronRight size={20} />
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">

        <div className={`col-span-3 rounded-3xl p-5 border overflow-hidden relative ${isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-white border-zinc-100 shadow-md'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl pointer-events-none rounded-full" style={{ backgroundColor: themeColor }} />
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Спожито калорій</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>{calories}</span>
                <span className={`text-sm font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>/ {tdee}</span>
              </div>
            </div>

            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="34" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="8" fill="none" />
                <motion.circle
                  cx="40" cy="40" r="34"
                  stroke={themeColor} strokeWidth="8" fill="none" strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                  animate={{ strokeDashoffset: ((100 - calPct) * (2 * Math.PI * 34)) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeDasharray={2 * Math.PI * 34}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <Flame size={16} color={themeColor} className="opacity-80" />
              </div>
            </div>
          </div>
        </div>

        <MacroRing label="Білки" consumed={protein} target={targetProt} color="#10b981" delay={0.1} />
        <MacroRing label="Жири" consumed={fat} target={targetFat} color="#f59e0b" delay={0.2} />
        <MacroRing label="Вуглеводи" consumed={carbs} target={targetCarbs} color="#3b82f6" delay={0.3} />

        <div className={`col-span-3 rounded-3xl p-5 border relative overflow-hidden ${isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-white border-zinc-100 shadow-md'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl pointer-events-none rounded-full bg-blue-500" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                <Droplet size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Вода</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {(waterConsumed / 1000).toFixed(1)}
                  </span>
                  <span className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    / {(targetWater / 1000).toFixed(1)} л
                  </span>
                </div>
              </div>
            </div>
            <span className="text-sm font-black text-blue-500">{Math.round(waterPct)}%</span>
          </div>

          <div className={`h-2.5 rounded-full overflow-hidden mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${waterPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>

          {isToday ? (
            <div className="grid grid-cols-3 gap-2">
              {[100, 200, 500].map(ml => (
                <button
                  key={ml}
                  onClick={() => handleAddWater(ml)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.96] ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 text-zinc-700'}`}
                >
                  +{ml} мл
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-center text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Дані за минулий день (тільки перегляд)
            </p>
          )}
        </div>

        <div className={`col-span-3 rounded-2xl p-4 flex items-center justify-between border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-500'}`}>
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Активність (BMR: {bmr})</p>
              <p className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{getActivityLabel(userData.multiplier)}</p>
            </div>
          </div>
        </div>

      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsSection user={user} isDark={isDark} themeColor={themeColor} />
      </motion.div>
    </motion.div>
  );
};