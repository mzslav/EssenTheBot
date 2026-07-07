import { useState, useEffect } from 'react';
import type { TelegramUser } from '../types/types';
import { addWeightEntry, getWeightHistory, deleteWeightEntry, type WeightEntry } from '../utils/weightService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../utils/formatters';

interface WeightTrackerProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor: string;
}

export const WeightTracker = ({ user, isDark, themeColor }: WeightTrackerProps) => {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newWeight, setNewWeight] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user?.id) loadHistory();
  }, [user?.id]);

  const loadHistory = async () => {
    if (!user?.id) return;
    try {
      const data = await getWeightHistory(user.id);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user?.id || !newWeight) return;
    setIsSaving(true);
    try {
      const entry = await addWeightEntry(user.id, parseFloat(newWeight), undefined, newNote || undefined);
      setEntries(prev => [entry, ...prev.filter(e => e.date !== entry.date)]);
      setNewWeight('');
      setNewNote('');
      setShowForm(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWeightEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };


  const chartData = [...entries]
    .reverse()
    .map(e => ({
      date: new Date(e.date).toLocaleDateString(getDateLocale(i18n.language), { day: 'numeric', month: 'short' }),
      weight: e.weight,
    }));

  const latest = entries[0];
  const oldest = entries.length > 1 ? entries[entries.length - 1] : null;
  const diff = latest && oldest ? +(latest.weight - oldest.weight).toFixed(1) : 0;
  const minWeight = entries.length > 0 ? Math.min(...entries.map(e => e.weight)) : 0;
  const maxWeight = entries.length > 0 ? Math.max(...entries.map(e => e.weight)) : 0;

  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-white/50' : 'text-slate-500';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale size={18} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          <h3 className={`text-sm font-bold ${textMain}`}>{t('weight_tracking.title')}</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
          style={{ background: `${themeColor}20`, color: themeColor }}
        >
          {showForm ? t('weight_tracking.hide') : t('weight_tracking.add_record')}
        </button>
      </div>

      {showForm && (
        <div className={`rounded-2xl p-4 border space-y-3 ${cardBg}`}>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={`block text-[10px] font-medium mb-1 ${textMuted}`}>{t('weight_tracking.weight_kg')}</label>
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="75.5"
                className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${isDark
                    ? 'bg-white/5 border border-white/10 text-white focus:ring-white/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-purple-200'
                  }`}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-[10px] font-medium mb-1 ${textMuted}`}>{t('weight_tracking.note')}</label>
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder={t('weight_tracking.note_placeholder')}
                className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${isDark
                    ? 'bg-white/5 border border-white/10 text-white focus:ring-white/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-purple-200'
                  }`}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newWeight || isSaving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}
          >
            {isSaving ? t('weight_tracking.saving') : t('weight_tracking.save')}
          </button>
        </div>
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-2xl p-3 border text-center ${cardBg}`}>
            <p className={`text-[9px] uppercase font-bold tracking-wider ${textMuted}`}>{t('weight_tracking.current')}</p>
            <p className={`text-xl font-black mt-0.5 ${textMain}`}>{latest?.weight}</p>
            <p className={`text-[9px] ${textMuted}`}>{t('results.kg')}</p>
          </div>
          <div className={`rounded-2xl p-3 border text-center ${cardBg}`}>
            <p className={`text-[9px] uppercase font-bold tracking-wider ${textMuted}`}>{t('weight_tracking.change')}</p>
            <p className={`text-xl font-black mt-0.5 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : textMain}`}>
              {diff > 0 ? '+' : ''}{diff}
            </p>
            <p className={`text-[9px] ${textMuted}`}>{t('results.kg')}</p>
          </div>
          <div className={`rounded-2xl p-3 border text-center ${cardBg}`}>
            <p className={`text-[9px] uppercase font-bold tracking-wider ${textMuted}`}>{t('weight_tracking.range')}</p>
            <p className={`text-xl font-black mt-0.5 ${textMain}`}>{(maxWeight - minWeight).toFixed(1)}</p>
            <p className={`text-[9px] ${textMuted}`}>{minWeight}–{maxWeight}</p>
          </div>
        </div>
      )}

      {chartData.length >= 2 && (
        <div className={`rounded-2xl p-4 border ${cardBg}`}>
          <p className={`text-xs font-semibold mb-3 ${textMain}`}>{t('weight_tracking.chart_title')}</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className={`px-3 py-2 rounded-xl shadow-xl text-xs ${isDark ? 'bg-slate-800 border border-white/10 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
                      <p className="font-bold">{label}</p>
                      <p style={{ color: themeColor }}>{payload[0].value} {t('results.kg')}</p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="weight" stroke={themeColor} strokeWidth={2.5}
                fill="url(#weightGrad)" dot={{ fill: themeColor, r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-14 rounded-2xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className={`p-8 text-center rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <div className="flex justify-center mb-3">
            <Scale size={32} className={isDark ? 'text-white/20' : 'text-slate-300'} />
          </div>
          <p className={`text-sm font-semibold mb-2 ${textMain}`}>{t('weight_tracking.no_data_title')}</p>
          <p className={`text-xs ${textMuted}`}>{t('weight_tracking.no_data_desc')}</p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className={`px-4 py-2.5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <p className={`text-xs font-semibold ${textMain}`}>{t('weight_tracking.history')} ({entries.length})</p>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
            {entries.slice(0, 20).map(entry => (
              <div key={entry.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1">
                  <p className={`text-sm font-bold ${textMain}`}>{entry.weight} {t('results.kg')}</p>
                  <p className={`text-[10px] ${textMuted}`}>
                    {new Date(entry.date).toLocaleDateString(getDateLocale(i18n.language), { day: 'numeric', month: 'long' })}
                    {entry.note && ` · ${entry.note}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className={`text-xs px-2 py-1 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-slate-100 text-slate-300'}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
