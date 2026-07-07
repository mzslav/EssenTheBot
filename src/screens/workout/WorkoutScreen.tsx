import { useState } from 'react';
import type { TelegramUser } from '../../types/types';
import { JournalTab } from './JournalTab';
import { PlansTab } from './PlansTab';
import { ProgressTab } from './ProgressTab';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, ClipboardList, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WorkoutScreenProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

type WorkoutTab = 'journal' | 'plans' | 'progress';

export const WorkoutScreen = ({ user, isDark, themeColor = '#8b5cf6' }: WorkoutScreenProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<WorkoutTab>('journal');

  const tabs: { id: WorkoutTab; label: string; icon: React.ReactNode }[] = [
    { id: 'journal', label: t('workout.journal', 'Журнал'), icon: <ClipboardList size={14} /> },
    { id: 'plans', label: t('workout.plans', 'Плани'), icon: <Target size={14} /> },
    { id: 'progress', label: t('workout.progress', 'Прогрес'), icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="w-full max-w-md px-2 pt-2" style={{ alignSelf: 'flex-start' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center px-1 mb-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {t('workout.title', 'Тренування')}
          </h1>
          <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {t('workout.subtitle', 'Відстежуй свій прогрес')}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
          <Dumbbell size={20} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`rounded-2xl p-1 flex gap-1 mb-4 ${isDark ? 'bg-zinc-900/60 border border-white/5' : 'bg-zinc-100 border border-zinc-200/50'}`}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-colors duration-300 flex items-center justify-center gap-1.5 ${
                isActive ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="workoutTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: themeColor }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'journal'  && <JournalTab  user={user} isDark={isDark} themeColor={themeColor} />}
          {activeTab === 'plans'    && <PlansTab    user={user} isDark={isDark} themeColor={themeColor} />}
          {activeTab === 'progress' && <ProgressTab user={user} isDark={isDark} themeColor={themeColor} />}
        </motion.div>
      </AnimatePresence>

      <div className="h-8" />
    </div>
  );
};