import React from 'react';
import { Home, Refrigerator, Dumbbell, User } from 'lucide-react';
import type { AppScreen } from '../types/types';

interface BottomNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  isDark: boolean;
  themeColor: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentScreen, 
  onNavigate, 
  isDark,
  themeColor 
}) => {
  
  const handleNavClick = (screen: string) => {
    onNavigate(screen as AppScreen);
  };

  const navItems = [
    { id: 'main', label: 'Головна', icon: <Home size={22} strokeWidth={2} /> },
    { id: 'fridge', label: 'Меню', icon: <Refrigerator size={22} strokeWidth={2} /> },
    { id: 'workout', label: 'Спорт', icon: <Dumbbell size={22} strokeWidth={2} /> },
    { id: 'results', label: 'Профіль', icon: <User size={22} strokeWidth={2} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[100] pointer-events-none">
      <div 
        className={`mx-auto max-w-sm h-16 rounded-3xl flex items-center justify-around px-2 shadow-2xl backdrop-blur-xl pointer-events-auto border transition-colors duration-500 ${
          isDark 
            ? 'bg-zinc-900/60 border-white/10' 
            : 'bg-white/70 border-black/5'
        }`}
      >
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-[0.95] ${
                isActive ? '-translate-y-1' : 'opacity-50 hover:opacity-100'
              }`}
              style={{ color: isActive ? themeColor : (isDark ? '#a1a1aa' : '#71717a') }}
            >
              {isActive && (
                <div 
                  className="absolute inset-0 blur-2xl opacity-20 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              )}
              
              <span className={`transform transition-transform duration-300 ${isActive ? 'scale-110 mb-1' : ''}`}>
                {item.icon}
              </span>
              
              {isActive && (
                <span className="text-[10px] font-bold tracking-tight absolute bottom-2">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};