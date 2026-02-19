import { useState } from 'react';
import type { TelegramUser } from '../../types/types';
import { JournalTab } from './JournalTab';
import { PlansTab } from './PlansTab';
import { ProgressTab } from './ProgressTab';

interface WorkoutScreenProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

type WorkoutTab = 'journal' | 'plans' | 'progress';

export const WorkoutScreen = ({ user, isDark, themeColor = '#8b5cf6' }: WorkoutScreenProps) => {
  const [activeTab, setActiveTab] = useState<WorkoutTab>('journal');

  const tabs: { id: WorkoutTab; label: string; icon: string }[] = [
    { id: 'journal', label: 'Журнал', icon: '📋' },
    { id: 'plans', label: 'Плани', icon: '📝' },
    { id: 'progress', label: 'Прогрес', icon: '📈' },
  ];

  return (
    <div className="w-full max-w-md px-2 pt-2" style={{ alignSelf: 'flex-start' }}>
      <div className="flex justify-between items-center px-1 mb-4">
        <div>
          <h1 className={`text-xl font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Тренування 💪
          </h1>
          <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Відстежуй свій прогрес
          </p>
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full animate-pulse shadow-lg"
          style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}
        />
      </div>

      <div className={`rounded-2xl p-1 flex gap-1 mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? 'text-white shadow-md'
                : isDark ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={activeTab === tab.id ? { background: themeColor } : {}}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'journal'  && <JournalTab  user={user} isDark={isDark} themeColor={themeColor} />}
      {activeTab === 'plans'    && <PlansTab    user={user} isDark={isDark} themeColor={themeColor} />}
      {activeTab === 'progress' && <ProgressTab user={user} isDark={isDark} themeColor={themeColor} />}

      <div className="h-8" />
    </div>
  );
};