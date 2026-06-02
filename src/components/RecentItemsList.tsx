import { useState } from 'react';
import type { MealRecord } from '../utils/supabaseService';
import { MealDetailModal } from './MealDetailModal';
import { Utensils, Camera, Mic, Keyboard, Lightbulb, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RecentItemsListProps {
  meals: MealRecord[];
  isLoading?: boolean;
  isDark: boolean;
  themeColor: string;
  onViewToday: () => void; 
  onDelete?: (id: number) => void;
  onAddToToday?: (meal: MealRecord) => void;
  onFavorite?: (meal: MealRecord) => void;
  onUpdate?: (meal: MealRecord) => void;
}

function formatDisplayTime(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

export const RecentItemsList = ({
  meals,
  isLoading = false,
  isDark,
  themeColor,
  onViewToday,
  onDelete,
  onAddToToday,
  onFavorite,
  onUpdate,
}: RecentItemsListProps) => {
  const { t } = useTranslation();
  const [selectedMeal, setSelectedMeal] = useState<MealRecord | null>(null);

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t('fridge.recently_added')}
        </h2>
        <button
          onClick={onViewToday}
          className="text-xs font-semibold transition-all hover:underline flex items-center gap-1"
          style={{ color: themeColor }}
        >
          {t('fridge.all_today')}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`h-16 rounded-2xl animate-pulse ${
                isDark ? 'bg-white/5' : 'bg-slate-100'
              }`}
            />
          ))
        ) : meals.length === 0 ? (
          <div
            className={`rounded-2xl p-6 text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}
          >
            <div className="flex justify-center mb-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}>
                <Utensils size={24} />
              </div>
            </div>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              {t('fridge.empty_today')}
            </p>
          </div>
        ) : (
          meals.slice(0, 3).map((meal) => (
            <button
              key={meal.id}
              onClick={() => setSelectedMeal(meal)}
              className={`w-full rounded-2xl p-3.5 border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">

                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}
                  style={{ color: themeColor }}
                >
                  <Utensils size={20} strokeWidth={2.5} />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3
                      className={`text-sm font-bold truncate ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {meal.name}
                    </h3>
                    {meal.type && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${
                          meal.type === 'photo'
                            ? 'bg-blue-500/20 text-blue-400'
                            : meal.type === 'voice'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {meal.type === 'photo' ? <Camera size={10} /> : meal.type === 'voice' ? <Mic size={10} /> : <Keyboard size={10} />}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isDark ? 'text-white/80' : 'text-slate-700'
                      }`}
                    >
                      {meal.calories} {t('stats.kcal')}
                    </span>
                    <span
                      className={`text-[10px] ${isDark ? 'text-white/25' : 'text-slate-200'}`}
                    >
                      ·
                    </span>
                    <span
                      className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}
                    >
                      {t('history.p')}{meal.protein} {t('history.f')}{meal.fat} {t('history.c')}{meal.carbs}
                    </span>
                    <span
                      className={`text-[10px] ml-auto flex-shrink-0 ${
                        isDark ? 'text-white/30' : 'text-slate-300'
                      }`}
                    >
                      {formatDisplayTime(meal.created_at)}
                    </span>
                  </div>
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`flex-shrink-0 ${isDark ? 'text-white/25' : 'text-slate-300'}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))
        )}
      </div>


      <div
        className={`rounded-2xl p-4 flex items-start gap-3 border ${
          isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-100 shadow-sm'
        }`}
      >
        <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-yellow-500/20 text-yellow-500' : 'bg-yellow-50 text-yellow-500'}`}>
          <Lightbulb size={18} />
        </div>
        <p className={`text-xs leading-relaxed font-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {t('fridge.log_hint')}
        </p>
      </div>

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          isDark={isDark}
          themeColor={themeColor}
          onClose={() => setSelectedMeal(null)}
          onDelete={onDelete}
          onAddToToday={onAddToToday}
          onFavorite={onFavorite}
          onUpdate={(updated) => { onUpdate?.(updated); setSelectedMeal(null); }}
          isToday={true} 
        />
      )}
    </>
  );
};