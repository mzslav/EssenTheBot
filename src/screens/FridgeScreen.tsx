import { useState, useEffect } from 'react';
import type { AIResponse, InputMode, FridgeScreenProps } from '../types/types';
import { InputSection } from '../components/InputSection';
import { AIResponseSection } from '../components/AIResponseSection';
import { RecentItemsList } from '../components/RecentItemsList';
import { AllMealsScreen } from './AllMealsScreen';
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

export const FridgeScreen = ({
  user,
  isDark,
  themeColor = '#8b5cf6',
}: FridgeScreenProps) => {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [currentInputMode, setCurrentInputMode] = useState<InputMode>('text');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllMeals, setShowAllMeals] = useState(false);

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
        setError('Невірний формат даних');
        setIsProcessing(false);
        return;
      }

      setAiResponse(response);
    } catch (err) {
      console.error('Помилка аналізу:', err);
      setError(err instanceof Error ? err.message : 'Невідома помилка');
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
      showToast('Потрібна авторизація для збереження', 'error');
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
      showToast(`${response.name} додано!`, 'success');
      resetAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Помилка збереження',
        'error'
      );
    }
  };

  const handleSubmitWithout = async () => {
    if (!aiResponse) return;
    await persistMeal(aiResponse);
  };

  const handleDeleteRecent = async (mealId: number) => {
    try {
      await deleteMeal(mealId);
      setTodayMeals((prev) => prev.filter((m) => m.id !== mealId));
      showToast('Запис видалено', 'success');
    } catch {
      showToast('Помилка видалення', 'error');
    }
  };

  const handleAddToToday = async (meal: MealRecord) => {
      if (!user?.id) return;
      try {
        const saved = await addMealToToday(user.id, meal, meal.emoji);
        const todayStr = new Date().toISOString().split('T')[0];
        const newMeal = { ...saved, _date: todayStr };
        setTodayMeals(prev => [newMeal, ...prev]);
        showToast(`${meal.name} додано знову!`, 'success');
      } catch (err) {
        showToast('Помилка додавання', 'error');
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
      <div className="flex justify-between items-center px-1 pt-2">
        <div>
          <h1
            className={`text-xl font-bold leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Мій холодильник 🥗
          </h1>
          <p
            className={`text-xs mt-0.5 font-medium ${
              isDark ? 'text-white/50' : 'text-slate-500'
            }`}
          >
            Додай страву будь-яким способом
          </p>
        </div>
        <button
          onClick={() => setShowAllMeals(true)}
          className="text-xs font-semibold transition-all hover:underline flex items-center gap-1"
          style={{ color: themeColor }}
        >
          Історія
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
      {error && (
        <div
          className={`rounded-2xl p-4 border ${
            isDark
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h4
                className={`text-sm font-bold mb-1 ${
                  isDark ? 'text-red-400' : 'text-red-900'
                }`}
              >
                Помилка
              </h4>
              <p
                className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}
              >
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className={`text-xs font-medium ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

      {!aiResponse && (
        <RecentItemsList
          meals={todayMeals}
          isLoading={isLoadingRecent}
          isDark={isDark}
          themeColor={themeColor}
          onViewToday={() => setShowAllMeals(true)}
          onDelete={handleDeleteRecent}
          onAddToToday={handleAddToToday}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};