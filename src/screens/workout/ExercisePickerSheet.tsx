import { useEffect, useMemo, useState } from 'react';
import type { ExerciseFormData, ExerciseLibraryItem, TelegramUser } from '../../types/types';
import { getFavoriteExercises, getRecentExercises, searchExerciseLibrary } from '../../utils/workoutService';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Dumbbell, Plus, Search, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExercisePickerSheetProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor: string;
  title: string;
  onClose: () => void;
  onSelect: (exercise: Partial<ExerciseFormData>) => void;
}

const toExerciseForm = (exercise: ExerciseLibraryItem): Partial<ExerciseFormData> => ({
  exercise_id: exercise.id,
  name: exercise.name,
  video_url: exercise.video_url ?? '',
  notes: exercise.notes ?? '',
});

export const ExercisePickerSheet = ({
  user,
  isDark,
  themeColor,
  title,
  onClose,
  onSelect,
}: ExercisePickerSheetProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [recent, setRecent] = useState<ExerciseLibraryItem[]>([]);
  const [favorites, setFavorites] = useState<ExerciseLibraryItem[]>([]);
  const [results, setResults] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([
      getRecentExercises(user.id),
      getFavoriteExercises(user.id),
      searchExerciseLibrary(user.id),
    ]).then(([recentData, favoriteData, allData]) => {
      setRecent(recentData);
      setFavorites(favoriteData);
      setResults(allData);
    }).catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const id = window.setTimeout(() => {
      setLoading(true);
      searchExerciseLibrary(user.id, query, selectedMuscle || undefined)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 180);

    return () => window.clearTimeout(id);
  }, [query, selectedMuscle, user?.id]);

  const muscleGroups = useMemo(() => {
    const groups = [...recent, ...favorites, ...results]
      .map(ex => ex.muscle_group)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(groups)).slice(0, 6);
  }, [favorites, recent, results]);

  const renderExercise = (exercise: ExerciseLibraryItem) => (
    <button
      key={exercise.id}
      onClick={() => {
        onSelect(toExerciseForm(exercise));
        onClose();
      }}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98] ${
        isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 hover:bg-white'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-zinc-500 shadow-sm'}`}>
        {exercise.is_favorite ? <Star size={16} fill="currentColor" /> : <Dumbbell size={17} />}
      </div>
      <div className="text-left flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{exercise.name}</p>
        <p className={`text-[10px] font-semibold truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {exercise.muscle_group || t('workout.exercise_picker.no_group', 'Без групи')}
        </p>
      </div>
      <Check size={16} style={{ color: themeColor }} />
    </button>
  );

  const createLabel = query.trim();

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed bottom-0 left-0 right-0 z-[101] p-5 rounded-t-3xl border-t max-h-[86vh] overflow-hidden flex flex-col ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'}`}
      >
        <div className="w-12 h-1.5 rounded-full bg-zinc-500/30 mx-auto mb-5" />
        <h3 className={`text-xl font-black mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{title}</h3>

        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border mb-3 ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>
          <Search size={17} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('workout.exercise_picker.search_placeholder', 'Пошук вправи...')}
            className="bg-transparent outline-none flex-1 text-sm font-semibold placeholder:text-zinc-500"
            autoFocus
          />
        </div>

        {muscleGroups.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3">
            <button
              onClick={() => setSelectedMuscle('')}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold border shrink-0 ${!selectedMuscle ? 'text-white border-transparent' : isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'}`}
              style={!selectedMuscle ? { background: themeColor } : {}}
            >
              {t('workout.exercise_picker.all', 'Всі')}
            </button>
            {muscleGroups.map(group => (
              <button
                key={group}
                onClick={() => setSelectedMuscle(group)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border shrink-0 ${selectedMuscle === group ? 'text-white border-transparent' : isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'}`}
                style={selectedMuscle === group ? { background: themeColor } : {}}
              >
                {group}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto space-y-5 pr-1 pb-5">
          {!query && favorites.length > 0 && (
            <section>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.exercise_picker.favorites', 'Улюблені')}</p>
              <div className="space-y-2">{favorites.map(renderExercise)}</div>
            </section>
          )}

          {!query && recent.length > 0 && (
            <section>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('workout.exercise_picker.recent', 'Недавні')}</p>
              <div className="space-y-2">{recent.map(renderExercise)}</div>
            </section>
          )}

          <section>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {loading ? t('workout.exercise_picker.loading', 'Шукаю...') : t('workout.exercise_picker.library', 'Бібліотека')}
            </p>
            <div className="space-y-2">
              {results.map(renderExercise)}
              {createLabel && !results.some(ex => ex.name.toLowerCase() === createLabel.toLowerCase()) && (
                <button
                  onClick={() => {
                    onSelect({ name: createLabel });
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: themeColor }}
                >
                  <Plus size={17} /> {t('workout.exercise_picker.create_new', 'Створити вправу')} "{createLabel}"
                </button>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
