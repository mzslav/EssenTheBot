import { useState, useEffect } from 'react';
import type { TelegramUser } from '../types/types';
import { getAllMeals, deleteMeal, addMealToToday, type MealRecord } from '../utils/supabaseService';
import { MealDetailModal } from '../components/MealDetailModal';
import { Toast, useToast } from '../components/Toast';
import { useFadeIn } from '../utils/useFadeIn';
import { Utensils, Plus, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface AllMealsScreenProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
  onBack: () => void;
}

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return i18n.t('history.today');
  if (d.toDateString() === yesterday.toDateString()) return i18n.t('history.yesterday');
  return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'pl' ? 'pl-PL' : i18n.language === 'ru' ? 'ru-RU' : 'uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(meals: MealRecord[]): { date: string; items: MealRecord[] }[] {
  const map = new Map<string, MealRecord[]>();
  meals.forEach(m => {
    const key = m._date || m.created_at.split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

export const AllMealsScreen = ({ user, isDark, themeColor = '#8b5cf6', onBack }: AllMealsScreenProps) => {
  const { t } = useTranslation();
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<MealRecord | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  const fadeIn = useFadeIn(!isLoading);

  useEffect(() => { loadMeals(); }, [user?.id]);

  const loadMeals = async () => {
    if (!user?.id) { setIsLoading(false); return; }
    try {
      const data = await getAllMeals(user.id);
      setMeals(data);
    } catch {
      showToast(t('history.error_loading'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (mealId: number) => {
    try {
      await deleteMeal(mealId);
      setMeals(prev => prev.filter(m => m.id !== mealId));
      showToast(t('fridge.deleted'), 'success');
    } catch { showToast(t('fridge.error_deleting'), 'error'); }
  };

  const handleAddToToday = async (meal: MealRecord) => {
    if (!user?.id) { showToast(t('fridge.auth_required'), 'error'); return; }
    try {
      const saved = await addMealToToday(user.id, meal, meal.emoji);
      setMeals(prev => [{ ...saved, _date: todayStr }, ...prev]);
      showToast(t('history.meal_added', { name: meal.name }), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('fridge.error_adding'), 'error');
    }
  };

  const groups = groupByDate(meals);

  return (
    <div className="w-full max-w-md min-h-screen pb-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className={`sticky top-0 z-40 px-4 pt-4 pb-3 ${isDark ? 'bg-slate-950/95' : 'bg-white/95'} backdrop-blur-sm rounded-2xl`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('history.title')}</h1>
            <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{t('history.total_meals', { count: meals.length })}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-4">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-16 rounded-2xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div style={fadeIn.style(0)} className="flex flex-col items-center justify-center py-24 gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}>
              <Utensils size={32} />
            </div>
            <p className={`text-sm font-semibold text-center whitespace-pre-wrap ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {t('history.empty')}
            </p>
          </div>
        ) : (
          groups.map(({ date, items }, groupIdx) => {
            const dayTotal = items.reduce((s, m) => s + m.calories, 0);
            const isToday = date === todayStr;
            return (
              <div key={date} style={fadeIn.style(groupIdx)}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className={`text-xs font-bold capitalize ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {formatGroupDate(date)}
                  </span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-white/8' : 'bg-slate-100'}`} />
                  <span className={`text-xs font-semibold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{dayTotal} {t('stats.kcal')}</span>
                </div>
                <div className="space-y-2">
                  {items.map(meal => (
                    <button
                      key={meal.id}
                      onClick={() => setSelectedMeal(meal)}
                      className={`w-full rounded-2xl p-3.5 border transition-all hover:scale-[1.005] active:scale-[0.995] text-left ${
                        isDark ? 'bg-white/5 border-white/8 hover:bg-white/10' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`} style={{ color: themeColor }}>
                          <Utensils size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{meal.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{meal.calories} {t('stats.kcal')}</span>
                            <span className={`text-[10px] ${isDark ? 'text-white/20' : 'text-slate-200'}`}>·</span>
                            <span className={`text-[10px] ${isDark ? 'text-white/35' : 'text-slate-400'}`}>{t('history.p')}{meal.protein} {t('history.f')}{meal.fat} {t('history.c')}{meal.carbs}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isToday && (
                            <button
                              onClick={e => { e.stopPropagation(); handleAddToToday(meal); }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
                              title={t('history.add_to_today')}
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          )}
                          <span className={`text-[10px] ${isDark ? 'text-white/25' : 'text-slate-300'}`}>
                            {new Date(meal.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          isDark={isDark}
          themeColor={themeColor}
          onClose={() => setSelectedMeal(null)}
          onDelete={handleDelete}
          onAddToToday={handleAddToToday}
          isToday={(selectedMeal._date || selectedMeal.created_at.split('T')[0]) === todayStr}
        />
      )}
    </div>
  );
};