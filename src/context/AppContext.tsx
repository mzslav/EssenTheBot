import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TelegramUser } from '../types/types';

interface AppContextType {
  user?: TelegramUser;
  isDark: boolean;
  themeColor: string;
  colorScheme: 'light' | 'dark';
  setAppTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const AppContext = createContext<AppContextType>({
  isDark: true,
  themeColor: '#8b5cf6',
  colorScheme: 'dark',
  setAppTheme: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | undefined>();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [themeParams, setThemeParams] = useState({
    bg_color: '#1a1a2e',
    text_color: '#ffffff',
    button_color: '#8b5cf6',
  });

  useEffect(() => {
    window.Telegram?.WebApp?.ready();

    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    setUser(telegramUser);

    const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    const scheme = savedTheme || window.Telegram?.WebApp?.colorScheme || 'dark';
    setColorScheme(scheme);

    const params = window.Telegram?.WebApp?.themeParams;
    if (params) {
      setThemeParams({
        bg_color: params.bg_color || '#1a1a2e',
        text_color: params.text_color || '#ffffff',
        button_color: params.button_color || '#8b5cf6',
      });
    }
  }, []);

  const isDark = colorScheme === 'dark';

  const setAppTheme = (theme: 'light' | 'dark' | 'system') => {
    if (theme === 'system') {
      localStorage.removeItem('app-theme');
      setColorScheme(window.Telegram?.WebApp?.colorScheme || 'dark');
    } else {
      localStorage.setItem('app-theme', theme);
      setColorScheme(theme);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isDark,
        themeColor: themeParams.button_color,
        colorScheme,
        setAppTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
