import { useState, useEffect } from 'react';
import type { TelegramUser } from '../types/types';
import { getFavorites, removeFavorite, incrementFavoriteUseCount, type FavoriteMeal } from '../utils/favoritesService';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Plus, Utensils, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FavoriteMealsProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor: string;
  onQuickAdd: (meal: { name: string; calories: number; protein: number; fat: number; carbs: number; emoji?: string }) => void;
}

export const FavoriteMeals = ({ user, isDark, themeColor, onQuickAdd }: FavoriteMealsProps) => {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { if (user?.id) loadFavorites(); }, [user?.id]);

  const loadFavorites = async () => {
    if (!user?.id) { setIsLoading(false); return; }
    try {
      const data = await getFavorites(user.id);
      setFavorites(data);
    } catch { } finally { setIsLoading(false); }
  };

  const handleQuickAdd = async (fav: FavoriteMeal) => {
    onQuickAdd({ name: fav.name, calories: fav.calories, protein: fav.protein, fat: fav.fat, carbs: fav.carbs, emoji: fav.emoji });
    try { await incrementFavoriteUseCount(fav.id); } catch { /* ignore */ }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm(t('common.confirm_delete', 'Дійсно видалити?'))) return;
    try { await removeFavorite(id); setFavorites(prev => prev.filter(f => f.id !== id)); } catch { /* ignore */ }
  };

  if (isLoading) return null;
  if (favorites.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-1 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2">
          <Star size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('fridge.quick_add', 'Швидке додавання')}</h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={isDark ? 'text-zinc-500' : 'text-zinc-400'}
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide pt-1">
              <AnimatePresence>
                {favorites.map(fav => (
                  <motion.div
                    key={fav.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className={`flex-shrink-0 rounded-3xl p-3 border w-[130px] relative group transition-colors ${isDark ? 'bg-zinc-900 border-zinc-800 shadow-sm' : 'bg-white border-zinc-200 shadow-sm'}`}
                  >
                    <button
                      onClick={() => handleRemove(fav.id)}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90 z-10 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-400 hover:text-zinc-900'}`}
                    >
                      <X size={12} strokeWidth={3} />
                    </button>

                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`} style={{ color: themeColor }}>
                      <Utensils size={18} strokeWidth={2.5} />
                    </div>

                    <p className={`text-[11px] font-bold truncate leading-tight mb-0.5 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{fav.name}</p>
                    <p className={`text-[10px] font-semibold mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{fav.calories} {t('stats.kcal')}</p>

                    <button
                      onClick={() => handleQuickAdd(fav)}
                      className="w-full py-2.5 rounded-xl text-[10px] font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md"
                      style={{ background: themeColor }}
                    >
                      <Plus size={14} strokeWidth={3} /> {t('barcode.add')}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
