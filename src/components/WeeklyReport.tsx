import { useState, useEffect } from 'react';
import type { TelegramUser } from '../types/types';
import { exportMealsForPeriod, exportWorkoutsForPeriod, exportWeightLogs, generateTextReport, shareToTelegram, generateCSV, downloadCSV } from '../utils/exportService';
import { motion } from 'motion/react';
import { BarChart3, Check, Copy, Share, FileSpreadsheet, X, Calendar, Activity } from 'lucide-react';

interface WeeklyReportProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor: string;
  onClose: () => void;
}

export const WeeklyReport = ({ user, isDark, themeColor, onClose }: WeeklyReportProps) => {
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReport = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const end = new Date().toISOString().split('T')[0];
      const startD = new Date();
      startD.setDate(startD.getDate() - (period === '7' ? 7 : 30));
      const start = startD.toISOString().split('T')[0];
      const label = period === '7' ? 'Тижневий' : 'Місячний';
      const [meals, workouts, weights] = await Promise.all([
        exportMealsForPeriod(user.id, start, end),
        exportWorkoutsForPeriod(user.id, start, end),
        exportWeightLogs(user.id),
      ]);
      setReport(generateTextReport(meals, workouts, weights, `${label} (${start} — ${end})`));
    } catch (e: any) {
      setReport('Помилка генерації звіту: ' + e.message);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { generateReport(); }, [period, user?.id]);

  const handleShare = () => { if (report) shareToTelegram(report); };
  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };
  const handleExportCSV = async () => {
    if (!user?.id) return;
    const end = new Date().toISOString().split('T')[0];
    const startD = new Date(); startD.setDate(startD.getDate() - (period === '7' ? 7 : 30));
    const meals = await exportMealsForPeriod(user.id, startD.toISOString().split('T')[0], end);
    const csv = generateCSV(meals);
    downloadCSV(csv, `essen-report-${end}.csv`);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed bottom-0 left-0 right-0 z-[101] p-6 rounded-t-3xl border-t h-[90vh] flex flex-col ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'}`}
      >
        <div className="w-12 h-1.5 rounded-full bg-zinc-500/30 mx-auto mb-6 flex-shrink-0" />
        
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
              <BarChart3 size={20} strokeWidth={2.5} />
            </div>
            <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Звіт активності</h3>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'}`}>
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className={`flex gap-1.5 p-1.5 rounded-2xl mb-6 flex-shrink-0 ${isDark ? 'bg-zinc-900/80 border border-zinc-800' : 'bg-zinc-100 border border-zinc-200'}`}>
          {(['7', '30'] as const).map(r => (
            <button key={r} onClick={() => setPeriod(r)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${period === r ? 'text-white shadow-md' : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
              style={period === r ? { background: themeColor } : {}}>
              <Calendar size={14} strokeWidth={2.5} />
              {r === '7' ? '7 днів' : '30 днів'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto mb-6 rounded-3xl relative">
          {isLoading ? (
            <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-dashed ${isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <Activity className="animate-pulse mb-3" size={32} style={{ color: themeColor }} />
              <p className={`text-sm font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Генеруємо звіт...</p>
            </div>
          ) : report ? (
            <div className={`h-full border rounded-3xl p-5 overflow-y-auto custom-scrollbar ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <pre className={`text-xs md:text-sm font-mono leading-relaxed whitespace-pre-wrap ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {report}
              </pre>
            </div>
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center rounded-3xl border border-dashed ${isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
               <p className={`text-sm font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Немає даних за цей період</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          <button onClick={handleCopy} disabled={!report || isLoading} className={`py-4 rounded-2xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}>
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            {copied ? 'Скопійовано' : 'Копіювати'}
          </button>
          <button onClick={handleShare} disabled={!report || isLoading} className={`py-4 rounded-2xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}>
            <Share size={18} /> Поділитись
          </button>
          <button onClick={handleExportCSV} disabled={!report || isLoading} className={`py-4 rounded-2xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}>
            <FileSpreadsheet size={18} /> Завант. CSV
          </button>
        </div>
      </motion.div>
    </>
  );
};
