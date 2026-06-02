// App.tsx
import { useState, useEffect } from 'react';
import { useTelegram } from './hooks';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { FormScreen } from './screens/FormScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { MainScreen } from './screens/MainScreen';
import { BottomNav } from './components/BottomNav';
import { Loader } from './components/Loader';
import supabase from './supabase/supabase-client';
import type { AppScreen, FormData } from './types/types';
import { FridgeScreen } from './screens/FridgeScreen';
import { WorkoutScreen } from './screens/workout/WorkoutScreen';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const AccessDeniedScreen = ({ isDark }: { isDark: boolean }) => (
  <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDark ? 'text-white' : 'text-slate-800'
    }`}>
    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h1 className="text-2xl font-bold mb-2">Доступ заборонено</h1>
    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
      Цей додаток працює лише всередині Telegram.
      <br />
      Будь ласка, відкрийте його через бот.
    </p>
  </div>
);

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('main');
  const [formData, setFormData] = useState<FormData>({});
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [isTelegramEnv, setIsTelegramEnv] = useState(true);
  const [isEnvChecking, setIsEnvChecking] = useState(true);

  const { user, isDark, themeColor } = useTelegram();

  useEffect(() => {
    const checkEnvironment = () => {
      const tg = (window as any).Telegram?.WebApp;
      const isValidTelegram = tg && tg.initData && tg.initData.length > 0;

      if (import.meta.env.DEV) { setIsTelegramEnv(true); setIsEnvChecking(false); return; }

      setIsTelegramEnv(!!isValidTelegram);
      setIsEnvChecking(false);
    };

    const timer = setTimeout(checkEnvironment, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkExistingUser = async () => {
      if (isEnvChecking || !isTelegramEnv) return;

      if (!user?.id) {
        setIsAuthChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('telegram_user_id, weight, height, age')
          .eq('telegram_user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Database error:", error);
          setCurrentScreen('welcome');
          return;
        }

        if (data && data.weight && data.height && data.age) {
          setCurrentScreen('main');
        } else {
          setCurrentScreen('welcome');
        }

      } catch (e) {
        console.error("Auth check error:", e);
        setCurrentScreen('welcome');
      } finally {
        setIsAuthChecking(false);
      }
    };

    if (!isEnvChecking && isTelegramEnv) {
      checkExistingUser();
    }
  }, [user?.id, isEnvChecking, isTelegramEnv]);

  const showNavigation = currentScreen && ['main', 'results', 'fridge', 'workout'].includes(currentScreen);

  if (isEnvChecking || (isTelegramEnv && isAuthChecking)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
        <Loader color={themeColor} />
      </div>
    );
  }

  if (!isTelegramEnv) {
    return (
      <div className={`min-h-screen flex flex-col relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'
        }`}>
        <AccessDeniedScreen isDark={isDark} />
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] flex flex-col relative overflow-hidden pt-4 ${isDark ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'
      }`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}>
      </div>

      <main className={`flex-1 flex ${currentScreen === 'workout' ? 'items-start' : 'items-center'} justify-center p-2 transition-all duration-300 ${showNavigation ? 'pb-24' : ''}`}>

        {currentScreen === 'welcome' && (
          <WelcomeScreen
            user={user}
            isDark={isDark}
            themeColor={themeColor}
            onStart={() => setCurrentScreen('form')}
          />
        )}

        {currentScreen === 'form' && (
          <FormScreen
            isDark={isDark}
            themeColor={themeColor}
            formData={formData}
            onFormDataChange={setFormData}
            onComplete={() => setCurrentScreen('results')}
          />
        )}

        {currentScreen === 'results' && (
          <ResultsScreen
            isDark={isDark}
            themeColor={themeColor}
            formData={formData}
            user={user}
            onComplete={() => setCurrentScreen('main')}
          />
        )}

        {currentScreen === 'fridge' && (
          <FridgeScreen
            user={user}
            isDark={isDark}
            themeColor={themeColor}
          />
        )}

        {currentScreen === 'main' && (
          <MainScreen
            user={user}
            isDark={isDark}
            themeColor={themeColor}
          />
        )}

        {currentScreen === 'workout' && (
          <WorkoutScreen
            user={user}
            isDark={isDark}
            themeColor={themeColor}
          />
        )}

      </main>

      {showNavigation && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          isDark={isDark}
          themeColor={themeColor}
        />
      )}
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  );
}