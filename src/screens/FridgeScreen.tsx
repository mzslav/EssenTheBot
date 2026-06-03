import { useState, useEffect } from 'react';
import type { AIResponse, InputMode, FridgeScreenProps } from '../types/types';
import { InputSection } from '../components/InputSection';
import { AIResponseSection } from '../components/AIResponseSection';
import { RecentItemsList } from '../components/RecentItemsList';
import { AllMealsScreen } from './AllMealsScreen';
import { FavoriteMeals } from '../components/FavoriteMeals';
import { ManualMealBuilder } from '../components/ManualMealBuilder';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Toast, useToast } from '../components/Toast';
import {
  analyzeTextInput,
  analyzePhotoInput,
  refineWithClarifications,
} from '../utils/openRouterService';
import {
  saveMeal,
  getMealsByDate,
  deleteMeal,
  addMealToToday,
  type MealRecord,
} from '../utils/supabaseService';
import { addFavorite } from '../utils/favoritesService';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Calculator, ScanLine, AlertCircle, X, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FridgeScreen = ({
  user,
  isDark,
  themeColor = '#8b5cf6',
}: FridgeScreenProps) => {
  const { t } = useTranslation();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [currentInputMode, setCurrentInputMode] = useState<InputMode>('text');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);

  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  const { toast, showToast, hideToast } = useToast();

  const [originalInput, setOriginalInput] = useState<{
    mode: InputMode;
    data: string | Blob | null;
    text?: string;
  } | null>(null);

  useEffect(() => {
    loadTodayMeals();
  }, [user?.id]);

  const loadTodayMeals = async () => {
    if (!user?.id) {
      setIsLoadingRecent(false);
      return;
    }
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const meals = await getMealsByDate(user.id, todayStr);
      setTodayMeals(meals);
    } catch (err) {
      console.error('Помилка завантаження:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleInputSubmit = async (
    mode: InputMode,
    data: string | Blob | null,
    text?: string
  ) => {
    setIsProcessing(true);
    setError(null);
    setCurrentInputMode(mode);
    setOriginalInput({ mode, data, text });

    try {
      let response: AIResponse;

      if (mode === 'text' && typeof data === 'string') {
        response = await analyzeTextInput(data);
      } else if (mode === 'photo' && typeof data === 'string') {
        response = await analyzePhotoInput(data, text);
      } else if (mode === 'voice' && typeof data === 'string') {
        response = await analyzeTextInput(data);
      } else {
        setError(t('fridge.invalid_format'));
        setIsProcessing(false);
        return;
      }

      setAiResponse(response);
    } catch (err) {
      console.error('Помилка аналізу:', err);
      setError(err instanceof Error ? err.message : t('fridge.unknown_error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitWithClarifications = async (answers: string[]) => {
    if (!aiResponse || !originalInput) return;

    setIsProcessing(true);
    setError(null);

    try {
      const refinedResponse = await refineWithClarifications(
        aiResponse,
        originalInput.mode as 'text' | 'photo',
        originalInput.mode === 'text'
          ? (originalInput.data as string)
          : (originalInput.text || ''),
        originalInput.mode === 'photo'
          ? (originalInput.data as string)
          : undefined,
        answers
      );

      setAiResponse(refinedResponse);

      if (refinedResponse.clarifyingQuestions.length === 0) {
        await persistMeal(refinedResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при уточненні');
    } finally {
      setIsProcessing(false);
    }
  };

  const persistMeal = async (response: AIResponse) => {
    if (!user?.id) {
      showToast(t('fridge.auth_required'), 'error');
      resetAll();
      return;
    }

    try {
      const saved = await saveMeal(
        user.id,
        {
          name: response.name,
          calories: response.calories,
          protein: response.protein,
          fat: response.fat,
          carbs: response.carbs,
        },
        currentInputMode
      );

      setTodayMeals((prev) => [saved, ...prev]);
      showToast(t('fridge.meal_added', { name: response.name }), 'success');
      resetAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t('fridge.error_saving'),
        'error'
      );
    }
  };

  const handleSubmitWithout = async (meal?: AIResponse) => {
    const dataToSave = meal || aiResponse;
    if (!dataToSave) return;
    await persistMeal(dataToSave);
  };

  const handleDeleteRecent = async (mealId: number) => {
    try {
      await deleteMeal(mealId);
      setTodayMeals((prev) => prev.filter((m) => m.id !== mealId));
      showToast(t('fridge.deleted'), 'success');
    } catch {
      showToast(t('fridge.error_deleting'), 'error');
    }
  };

  const handleAddToToday = async (meal: MealRecord) => {
    if (!user?.id) return;
    try {
      const saved = await addMealToToday(user.id, meal, meal.emoji);
      const todayStr = new Date().toISOString().split('T')[0];
      const newMeal = { ...saved, _date: todayStr };
      setTodayMeals(prev => [newMeal, ...prev]);
      showToast(t('fridge.meal_added_again', { name: meal.name }), 'success');
    } catch (err) {
      showToast(t('fridge.error_adding'), 'error');
    }
  };

  const resetAll = () => {
    setAiResponse(null);
    setError(null);
    setOriginalInput(null);
  };

  const handleModeChange = (mode: InputMode) => {
    if (isProcessing) return;
    setInputMode(mode);
    setAiResponse(null);
    setError(null);
  };

  const handleDirectSave = async (meal: { name: string; calories: number; protein: number; fat: number; carbs: number }) => {
    if (!user?.id) { showToast(t('fridge.auth_required'), 'error'); return; }
    try {
      const saved = await saveMeal(user.id, meal, 'text');
      setTodayMeals(prev => [saved, ...prev]);
      showToast(t('fridge.meal_added', { name: meal.name }), 'success');
      setShowManual(false);
      setShowBarcode(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('fridge.error'), 'error');
    }
  };

  const handleFavoriteMeal = async (meal: MealRecord) => {
    if (!user?.id) return;
    try {
      await addFavorite(user.id, { name: meal.name, calories: meal.calories, protein: meal.protein, fat: meal.fat, carbs: meal.carbs, emoji: meal.emoji });
      showToast(t('fridge.added_to_favorites', { name: meal.name }), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('fridge.error'), 'error');
    }
  };

  const handleQuickAddFavorite = async (meal: { name: string; calories: number; protein: number; fat: number; carbs: number; emoji?: string }) => {
    if (!user?.id) return;
    try {
      const saved = await addMealToToday(user.id, meal, meal.emoji);
      setTodayMeals(prev => [saved, ...prev]);
      showToast(t('fridge.meal_added', { name: meal.name }), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('fridge.error'), 'error');
    }
  };

  const handleMealUpdate = (updatedMeal: MealRecord) => {
    setTodayMeals(prev => prev.map(m => m.id === updatedMeal.id ? updatedMeal : m));
  };

  if (showAllMeals) {
    return (
      <AllMealsScreen
        user={user}
        isDark={isDark}
        themeColor={themeColor}
        onBack={() => setShowAllMeals(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-md pb-8 space-y-4 px-2">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center px-1 pt-2 gap-2">
        <div className="flex-1 min-w-0">
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {t('fridge.title')}
          </h1>
          <p className={`text-xs mt-0.5 font-medium leading-tight ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {t('fridge.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowAllMeals(true)}
          className="text-xs font-semibold transition-all active:scale-95 hover:underline flex items-center gap-1 bg-transparent px-2 py-1 rounded-lg flex-shrink-0"
          style={{ color: themeColor }}
        >
          <History size={14} /> {t('fridge.history')} <ChevronRight size={14} />
        </button>
      </motion.div>

      <FavoriteMeals user={user} isDark={isDark} themeColor={themeColor} onQuickAdd={handleQuickAddFavorite} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2">
        <button onClick={() => { setShowManual(!showManual); setShowBarcode(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98] ${showManual ? 'text-white shadow-md' : isDark ? 'bg-zinc-900/50 text-zinc-400 border border-white/5' : 'bg-zinc-100 text-zinc-600 border border-zinc-200/50'}`}
          style={showManual ? { background: themeColor } : {}}>
          <Calculator size={14} /> {t('fridge.manual_input')}
        </button>
        <button onClick={() => { setShowBarcode(!showBarcode); setShowManual(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98] ${showBarcode ? 'text-white shadow-md' : isDark ? 'bg-zinc-900/50 text-zinc-400 border border-white/5' : 'bg-zinc-100 text-zinc-600 border border-zinc-200/50'}`}
          style={showBarcode ? { background: themeColor } : {}}>
          <ScanLine size={14} /> {t('fridge.barcode')}
        </button>
      </motion.div>

      {showManual && (
        <ManualMealBuilder isDark={isDark} themeColor={themeColor} onSubmit={handleInputSubmit} isProcessing={isProcessing} onSaveDirect={handleDirectSave} />
      )}

      {showBarcode && (
        <BarcodeScanner isDark={isDark} themeColor={themeColor} onProductFound={handleDirectSave} onClose={() => setShowBarcode(false)} />
      )}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl p-4 border overflow-hidden ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
              }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className={`flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} size={20} />
              <div className="flex-1">
                <h4 className={`text-xs font-bold mb-0.5 ${isDark ? 'text-red-400' : 'text-red-900'}`}>
                  {t('fridge.error')}
                </h4>
                <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className={`text-xs font-medium opacity-70 hover:opacity-100 ${isDark ? 'text-red-400' : 'text-red-600'}`}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InputSection
        isDark={isDark}
        themeColor={themeColor}
        inputMode={inputMode}
        setInputMode={handleModeChange}
        onSubmit={handleInputSubmit}
        isProcessing={isProcessing}
      />

      {aiResponse && (
        <AIResponseSection
          aiResponse={aiResponse}
          isDark={isDark}
          themeColor={themeColor}
          onSubmitWithClarifications={handleSubmitWithClarifications}
          onSubmitWithout={handleSubmitWithout}
          isProcessing={isProcessing}
        />
      )}

      {!aiResponse && !showManual && !showBarcode && (
        <RecentItemsList
          meals={todayMeals}
          isLoading={isLoadingRecent}
          isDark={isDark}
          themeColor={themeColor}
          onViewToday={() => setShowAllMeals(true)}
          onDelete={handleDeleteRecent}
          onAddToToday={handleAddToToday}
          onFavorite={handleFavoriteMeal}
          onUpdate={handleMealUpdate}
        />
      )}

    </div>
  );
};