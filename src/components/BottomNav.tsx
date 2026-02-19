import React from 'react';
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
    {
      id: 'main',
      label: 'Головна',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
{
      id: 'fridge',
      label: 'Холодильник',
      icon: (
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 490 490" fill="currentColor">
  
          <g stroke="currentColor" strokeWidth="8">
            <path d="M385,0H105C93.972,0,85,8.972,85,20v450c0,11.028,8.972,20,20,20h280c11.028,0,20-8.972,20-20V20
              C405,8.972,396.028,0,385,0z M105,20h280v175H105V20z M105,470V250h220v-20H105v-15h280l0.001,255H105z"/>
            <path d="M335,295h-20v20h10v30h-10v20h20c5.523,0,10-4.478,10-10v-50C345,299.478,340.523,295,335,295z"/>
            <path d="M335,75h-20v20h10v30h-10v20h20c5.523,0,10-4.478,10-10V85C345,79.478,340.523,75,335,75z"/>
            <rect x="120" y="130" width="30" height="20"/>
            <rect x="120" y="160" width="50" height="20"/>
          </g>
        </svg>
      )
    },
    {
      id: 'workout',
      label: 'Спорт',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.31885 12.1982L12.1989 8.31823M15.3029 11.4222L11.4229 15.3023" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3.43157 15.6193C2.52737 14.7151 2.07528 14.263 2.0108 13.7109C1.9964 13.5877 1.9964 13.4632 2.0108 13.3399C2.07528 12.7879 2.52737 12.3358 3.43156 11.4316C4.33575 10.5274 4.78785 10.0753 5.33994 10.0108C5.46318 9.9964 5.58768 9.9964 5.71092 10.0108C6.26301 10.0753 6.71511 10.5274 7.6193 11.4316L12.5684 16.3807C13.4726 17.2849 13.9247 17.737 13.9892 18.2891C14.0036 18.4123 14.0036 18.5368 13.9892 18.6601C13.9247 19.2122 13.4726 19.6642 12.5684 20.5684C11.6642 21.4726 11.2122 21.9247 10.6601 21.9892C10.5368 22.0036 10.4123 22.0036 10.2891 21.9892C9.73699 21.9247 9.28489 21.4726 8.3807 20.5684L3.43157 15.6193Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11.4316 7.6193C10.5274 6.71511 10.0753 6.26301 10.0108 5.71092C9.9964 5.58768 9.9964 5.46318 10.0108 5.33994C10.0753 4.78785 10.5274 4.33576 11.4316 3.43156C12.3358 2.52737 12.7879 2.07528 13.3399 2.0108C13.4632 1.9964 13.5877 1.9964 13.7109 2.0108C14.263 2.07528 14.7151 2.52737 15.6193 3.43156L20.5684 8.3807C21.4726 9.28489 21.9247 9.73699 21.9892 10.2891C22.0036 10.4123 22.0036 10.5368 21.9892 10.6601C21.9247 11.2122 21.4726 11.6642 20.5684 12.5684C19.6642 13.4726 19.2122 13.9247 18.6601 13.9892C18.5368 14.0036 18.4123 14.0036 18.2891 13.9892C17.737 13.9247 17.2849 13.4726 16.3807 12.5684L11.4316 7.6193Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M18.0186 2.49805L21.1226 5.60206" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.49756 18.0186L5.60157 21.1226" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'results',
      label: 'Профіль',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
  ];

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 h-16 rounded-2xl flex items-center justify-around px-2 pt-2 shadow-lg backdrop-blur-md z-[100] transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-800/80 border border-slate-700/50' 
          : 'bg-slate-100/90 border border-slate-300 shadow-xl'
      }`}
    >
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
              isActive ? '-translate-y-1' : 'opacity-60 hover:opacity-100'
            }`}
            style={{ 
              color: isActive ? themeColor : (isDark ? '#cbd5e1' : '#64748b') 
            }}
          >
            {isActive && (
              <div 
                className="absolute inset-0 blur-xl opacity-20 rounded-full"
                style={{ backgroundColor: themeColor }}
              />
            )}
            
            <span className={`transform transition-transform ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </span>
            
            <span className={`text-[10px] font-medium mt-1 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};