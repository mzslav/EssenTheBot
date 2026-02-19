import { useState } from 'react';
import type { MealRecord } from '../utils/supabaseService';
import { MealDetailModal } from './MealDetailModal';

interface RecentItemsListProps {
  meals: MealRecord[];
  isLoading?: boolean;
  isDark: boolean;
  themeColor: string;
  onViewToday: () => void; 
  onDelete?: (id: number) => void;
  onAddToToday?: (meal: MealRecord) => void;
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
}: RecentItemsListProps) => {
  const [selectedMeal, setSelectedMeal] = useState<MealRecord | null>(null);

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Додано нещодавно
        </h2>
        <button
          onClick={onViewToday}
          className="text-xs font-semibold transition-all hover:underline flex items-center gap-1"
          style={{ color: themeColor }}
        >
          Всі за сьогодні
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
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
            <div className="text-3xl mb-2">🍽️</div>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              Сьогодні ще нічого не додано.
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
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ background: `${themeColor}18` }}
                >
                  {meal.emoji || '🍽️'}
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
                        {meal.type === 'photo' ? '📸' : meal.type === 'voice' ? '🎤' : '⌨️'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isDark ? 'text-white/80' : 'text-slate-700'
                      }`}
                    >
                      {meal.calories} ккал
                    </span>
                    <span
                      className={`text-[10px] ${isDark ? 'text-white/25' : 'text-slate-200'}`}
                    >
                      ·
                    </span>
                    <span
                      className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}
                    >
                      Б:{meal.protein} Ж:{meal.fat} В:{meal.carbs}
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
        className={`rounded-2xl p-3.5 flex items-center gap-3 ${
          isDark ? 'bg-white/5' : 'bg-gradient-to-r from-purple-50 to-blue-50'
        }`}
      >
        <span className="text-xl">💡</span>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          Записуй всі прийоми їжі для точного підрахунку калорій
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
          isToday={true} 
        />
      )}
    </>
  );
};