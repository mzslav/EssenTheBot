import { useEffect, useState, useCallback } from 'react';
import type { TelegramUser } from '../types/types';
import supabase from '../supabase/supabase-client';
import { getTotalsByDate, getWaterByDate, updateTodayWater } from '../utils/supabaseService';
import { StatsSection } from '../components/StatsSection';
import { MainScreenSkeleton } from '../components/Skeleton';
import { useFadeIn } from '../utils/useFadeIn';

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
  if (!goalStr) return '⚖️ Підтримка ваги';
  if (goalStr.includes('Схуднути') || goalStr.includes('Схуднення')) return '🔥 Схуднення';
  if (goalStr.includes('Набрати') || goalStr.includes('Набір')) return '💪 Набір маси';
  return '⚖️ Підтримка ваги';
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
  const days = ['Неділя','Понеділок','Вівторок','Середа','Четвер','П\'ятниця','Субота'];
  const months = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export const MainScreen = ({ user, isDark, themeColor = '#8b5cf6' }: MainScreenProps) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState<Date>(todayDate);

  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [dayLoading, setDayLoading] = useState(false);

  const isToday = toDateStr(viewDate) === toDateStr(todayDate);
  const fadeIn = useFadeIn(!loading);

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
    setDayLoading(true);
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
    } finally {
      setDayLoading(false);
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
      await updateTodayWater(user.id, next);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <MainScreenSkeleton isDark={isDark} />;
  if (!userData) return <div className="text-center p-8 opacity-50">Дані відсутні,збережи профіль перед початком використання додатку</div>;

  const tdee = userData.TDEE || 2000;
  const targetProt = userData.protein || 100;
  const targetFat = userData.fat || 60;
  const targetCarbs = userData.carbs || 250;
  const targetWater = userData.waterPerDay || 2500;
  const bmr = Math.round(userData.TDEE_Normal / (userData.multiplier || 1.2));
  const calPct = Math.min((calories / tdee) * 100, 100);
  const waterPct = Math.min((waterConsumed / targetWater) * 100, 100);

  const CircularProgress = ({ progress, size = 120 }: { progress: number; size?: number }) => {
    const sw = 10;
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const off = circ - (progress / 100) * circ;
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            className="transition-all duration-500 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {dayLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className="text-2xl font-black text-white">{calories}</div>
              <div className="text-[9px] text-white/70 font-medium">з {tdee}</div>
              <div className="text-base font-bold text-white mt-0.5">{Math.round(calPct)}%</div>
            </>
          )}
        </div>
      </div>
    );
  };

  const MacroBar = ({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) => (
    <div className="flex-1">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[9px] uppercase tracking-wider font-semibold text-white/80">{label}</span>
        <span className="text-xs font-bold text-white">
          {dayLoading ? '…' : consumed}<span className="text-[10px] text-white/70">/{target}г</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: dayLoading ? '0%' : `${Math.min((consumed / Math.max(target, 1)) * 100, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );

  const InfoCard = ({ icon, title, mainValue, details, colorClass, extraInfo }: any) => (
    <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-slate-50'}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{mainValue}</span>
            <span className={`text-xs font-medium ${colorClass || (isDark ? 'text-white/60' : 'text-slate-500')}`}>{details}</span>
          </div>
          {extraInfo && <p className={`text-[10px] mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{extraInfo}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md pb-8 space-y-5 px-2">
      <div style={fadeIn.style(0)} className="flex justify-between items-center px-1 pt-2">
        <div>
          <h1 className={`text-xl font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Привіт, {userData.first_name || 'Користувач'} 👋
          </h1>
          <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            {getGoalLabel(userData.goal)}
          </p>
        </div>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
      </div>

      <div style={fadeIn.style(1)} className={`rounded-2xl p-3 flex items-center justify-between ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        <button
          onClick={goBack}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 shadow-sm'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center flex-1 mx-2">
          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatDisplayDate(viewDate)}</p>
          {isToday && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block text-white" style={{ background: themeColor }}>
              Сьогодні
            </span>
          )}
        </div>
        <button
          onClick={goForward}
          disabled={isToday}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            isToday
              ? isDark ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              : isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div
        className="rounded-3xl p-5 text-white relative overflow-hidden shadow-xl"
        style={{ ...fadeIn.style(2), background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
      >
        <div className="absolute top-[-30%] right-[-20%] w-48 h-48 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-30%] left-[-15%] w-40 h-40 bg-black/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <p className="text-[10px] font-semibold text-white/70 mb-3 uppercase tracking-wide text-center">
            {isToday ? 'Щоденна ціль' : 'Результат дня'}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <CircularProgress progress={calPct} size={120} />
            </div>
            <div className="flex-1 space-y-2.5 bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-lg">
              <MacroBar label="Білки"     consumed={protein} target={targetProt}  color="#10b981" />
              <MacroBar label="Жири"      consumed={fat}     target={targetFat}   color="#f59e0b" />
              <MacroBar label="Вуглеводи" consumed={carbs}   target={targetCarbs} color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      <div style={fadeIn.style(3)} className={`rounded-2xl p-4 border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-blue-50'}`}>
              <span className="text-base">💧</span>
            </div>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Вода</p>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {dayLoading ? '…' : (waterConsumed / 1000).toFixed(1)}
                <span className="text-xs font-normal opacity-70">/{(targetWater / 1000).toFixed(1)} л</span>
              </p>
            </div>
          </div>
          <span className="text-lg font-bold text-blue-500">{dayLoading ? '…' : Math.round(waterPct)}%</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${waterPct}%` }}
          />
        </div>
        {isToday ? (
          <div className="flex gap-2">
            {[100, 200, 500].map(ml => (
              <button
                key={ml}
                onClick={() => handleAddWater(ml)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                +{ml}мл
              </button>
            ))}
          </div>
        ) : (
          <p className={`text-center text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
            Дані за {formatDisplayDate(viewDate)} (тільки перегляд)
          </p>
        )}
      </div>

      <div style={fadeIn.style(4)} className="space-y-3">
        <InfoCard
          icon="🏃"
          title="Рівень активності"
          mainValue={getActivityLabel(userData.multiplier)}
          details={`(×${userData.multiplier})`}
          colorClass={isDark ? 'text-purple-400' : 'text-purple-600'}
          extraInfo={`Базовий метаболізм (BMR): ${bmr} ккал`}
        />
      </div>

      <div style={fadeIn.style(5)}>
        <StatsSection user={user} isDark={isDark} themeColor={themeColor} />
      </div>
    </div>
  );
};