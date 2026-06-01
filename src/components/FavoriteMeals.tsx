import { useState, useEffect } from 'react';
import type { TelegramUser } from '../types/types';
import { getFavorites, removeFavorite, incrementFavoriteUseCount, type FavoriteMeal } from '../utils/favoritesService';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Plus, Utensils } from 'lucide-react';

interface FavoriteMealsProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor: string;
  onQuickAdd: (meal: { name: string; calories: number; protein: number; fat: number; carbs: number; emoji?: string }) => void;
}

export const FavoriteMeals = ({ user, isDark, themeColor, onQuickAdd }: FavoriteMealsProps) => {
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (user?.id) loadFavorites(); }, [user?.id]);

  const loadFavorites = async () => {
    if (!user?.id) { setIsLoading(false); return; }
    try {
      const data = await getFavorites(user.id);
      setFavorites(data);
    } catch { /* ignore */ } finally { setIsLoading(false); }
  };

  const handleQuickAdd = async (fav: FavoriteMeal) => {
    onQuickAdd({ name: fav.name, calories: fav.calories, protein: fav.protein, fat: fav.fat, carbs: fav.carbs, emoji: fav.emoji });
    try { await incrementFavoriteUseCount(fav.id); } catch { /* ignore */ }
  };

  const handleRemove = async (id: number) => {
    try { await removeFavorite(id); setFavorites(prev => prev.filter(f => f.id !== id)); } catch { /* ignore */ }
  };

  if (isLoading) return null;
  if (favorites.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Star size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
        <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Швидке додавання</h3>
      </div>
      
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        <AnimatePresence>
          {favorites.map(fav => (
            <motion.div 
              key={fav.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`flex-shrink-0 rounded-3xl p-3 border w-[130px] relative group transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 shadow-sm' : 'bg-white border-zinc-200 shadow-sm'}`}
            >
              <button 
                onClick={() => handleRemove(fav.id)}
                className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 z-10 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
              >
                <X size={12} strokeWidth={3} />
              </button>
              
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                {fav.emoji && !['🍔','🍕','🥤','🍽️'].includes(fav.emoji) ? (
                  <span className="text-xl">{fav.emoji}</span>
                ) : (
                  <Utensils size={18} className={isDark ? 'text-zinc-600' : 'text-zinc-400'} />
                )}
              </div>
              
              <p className={`text-[11px] font-bold truncate leading-tight mb-0.5 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{fav.name}</p>
              <p className={`text-[10px] font-semibold mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{fav.calories} ккал</p>
              
              <button 
                onClick={() => handleQuickAdd(fav)}
                className="w-full py-2.5 rounded-xl text-[10px] font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md"
                style={{ background: themeColor }}
              >
                <Plus size={14} strokeWidth={3} /> Додати
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
