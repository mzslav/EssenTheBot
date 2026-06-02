import { useState } from 'react';
import type { InputMode } from '../types/types';
import { motion } from 'motion/react';
import { Calculator, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ManualMealBuilderProps {
  isDark: boolean;
  themeColor: string;
  onSubmit: (mode: InputMode, data: string | Blob | null, text?: string) => void;
  isProcessing: boolean;
  onSaveDirect: (meal: { name: string; calories: number; protein: number; fat: number; carbs: number }) => void;
}

export const ManualMealBuilder = ({ isDark, themeColor, onSaveDirect, isProcessing }: ManualMealBuilderProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');

  const canSubmit = name.trim() && calories;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSaveDirect({
      name: name.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      fat: parseInt(fat) || 0,
      carbs: parseInt(carbs) || 0,
    });
    setName('');
    setCalories('');
    setProtein('');
    setFat('');
    setCarbs('');
  };

  const inputClass = `w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none transition-all border ${
    isDark
      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600'
      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400'
  }`;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
      <div className={`rounded-3xl border p-5 space-y-4 ${isDark ? 'bg-zinc-950 border-zinc-800 shadow-xl' : 'bg-white border-zinc-200 shadow-lg'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Calculator size={18} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {t('fridge.manual_input')}
          </h3>
        </div>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('manual.name_placeholder')}
          className={inputClass}
          disabled={isProcessing}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('manual.calories')}
            </label>
            <input type="number" inputMode="decimal" value={calories} onChange={e => setCalories(e.target.value)}
              placeholder="350" className={`${inputClass} text-lg`} disabled={isProcessing} />
          </div>
          
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('manual.protein')}
            </label>
            <input type="number" inputMode="decimal" value={protein} onChange={e => setProtein(e.target.value)}
              placeholder="25" className={inputClass} disabled={isProcessing} />
          </div>
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('manual.fat')}
            </label>
            <input type="number" inputMode="decimal" value={fat} onChange={e => setFat(e.target.value)}
              placeholder="12" className={inputClass} disabled={isProcessing} />
          </div>
          <div className="col-span-2">
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('manual.carbs')}
            </label>
            <input type="number" inputMode="decimal" value={carbs} onChange={e => setCarbs(e.target.value)}
              placeholder="40" className={inputClass} disabled={isProcessing} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isProcessing}
          className="mt-2 w-full py-4 rounded-2xl text-sm font-bold text-white shadow-lg disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: themeColor }}
        >
          {isProcessing ? t('manual.adding') : <><Save size={18} strokeWidth={3} /> {t('manual.add_meal')}</>}
        </button>
      </div>
    </motion.div>
  );
};
