import { useState, useEffect } from 'react';


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
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const AccessDeniedScreen = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}>
      </div>

      <div className="relative max-w-sm w-full z-10 flex flex-col items-center">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-xl ${isDark ? 'bg-zinc-900 shadow-black/50 border border-white/5' : 'bg-white shadow-zinc-200/50 border border-zinc-100'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-blue-400' : 'text-blue-500'}>
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-3">
          Telegram Only App
        </h1>
        
        <p className={`text-sm mb-10 px-4 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          This application is designed to run exclusively within Telegram as a Mini App. Please launch it directly from our official bot to sync your data.
        </p>

        <a 
          href="https://t.me/EssenTheBot" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`w-full py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg ${isDark ? 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-500' : 'bg-blue-500 text-white shadow-blue-500/30 hover:bg-blue-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Open @EssenTheBot
        </a>
      </div>
    </div>
  );
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('main');
  const [formData, setFormData] = useState<FormData>({});
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [isTelegramEnv, setIsTelegramEnv] = useState(true);
  const [isEnvChecking, setIsEnvChecking] = useState(true);

  const { user, isDark, themeColor } = useAppContext();

  useEffect(() => {
    const checkEnvironment = () => {
      const tg = (window as any).Telegram?.WebApp;
      const isValidTelegram = tg && tg.initData && tg.initData.length > 0;

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
        setIsTelegramEnv(false);
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