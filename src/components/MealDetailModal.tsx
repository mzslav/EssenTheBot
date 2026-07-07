import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { MealRecord } from '../utils/supabaseService';
import supabase from '../supabase/supabase-client';
import { Utensils, X, Pencil, Star, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import i18n from '../i18n';
import { formatDisplayTime } from '../utils/formatters';

interface MealDetailModalProps {
  meal: MealRecord;
  isDark: boolean;
  themeColor: string;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onAddToToday?: (meal: MealRecord) => void;
  onFavorite?: (meal: MealRecord) => void;
  onUpdate?: (meal: MealRecord) => void;
  isToday?: boolean;
}

function formatDisplayDate(dateStr?: string, lang: string = 'uk'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
}


const MacroBar = ({ label, value, total, color, isDark }: { label: string; value: number; total: number; color: string; isDark: boolean }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-500'}`}>{label}</span>
        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}г</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

export const MealDetailModal = ({
  meal, isDark, themeColor, onClose, onDelete, onAddToToday, onFavorite, onUpdate,
}: MealDetailModalProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    fat: meal.fat,
    carbs: meal.carbs,
  });
  const [isSaving, setIsSaving] = useState(false);
  const totalMacros = meal.protein + meal.fat + meal.carbs;
  const showAddToday = !!onAddToToday;

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('meals')
        .update({
          name: editData.name,
          calories: editData.calories,
          protein: editData.protein,
          fat: editData.fat,
          carbs: editData.carbs,
        })
        .eq('id', meal.id);
      if (error) throw error;
      if (onUpdate) {
        onUpdate({ ...meal, ...editData });
      }
      setIsEditing(false);
    } catch (e: any) {
      alert(`${t('common.error_saving')}: ` + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full bg-transparent text-center font-bold focus:outline-none focus:ring-2 rounded-lg px-2 py-1 ${
    isDark ? 'text-white focus:ring-white/20' : 'text-slate-900 focus:ring-purple-200'
  }`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-t-3xl p-5 pb-8 space-y-3.5 ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        style={{ animation: 'mealModalUp 0.35s cubic-bezier(0.34,1.4,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-10 h-1 rounded-full mx-auto ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />

        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`} style={{ color: themeColor }}>
            <Utensils size={28} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input type="text" value={editData.name} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full text-lg font-black bg-transparent focus:outline-none border-b-2 ${isDark ? 'text-white border-white/20' : 'text-slate-900 border-slate-200'}`} />
            ) : (
              <h2 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{meal.name}</h2>
            )}
            <p className={`text-[11px] mt-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
              {meal._date ? formatDisplayDate(meal._date, i18n.language) : ''} · {formatDisplayTime(meal.created_at, i18n.language)}
            </p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}><X size={16} strokeWidth={3} /></button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { key: 'calories' as const, label: t('stats.kcal'), color: themeColor },
                { key: 'protein' as const, label: t('stats.protein'), color: '#10b981' },
                { key: 'fat' as const, label: t('stats.fat'), color: '#f59e0b' },
                { key: 'carbs' as const, label: t('stats.carbs'), color: '#3b82f6' },
              ].map(f => (
                <div key={f.key} className={`rounded-xl p-2 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <input type="number" value={editData[f.key]}
                    onChange={e => setEditData(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))}
                    className={inputClass} style={{ color: f.color }} />
                  <div className={`text-[9px] mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{f.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>{t('common.cancel')}</button>
              <button onClick={handleSaveEdit} disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-3 text-center text-white" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}>
              <div className="text-4xl font-black tracking-tight">{meal.calories}</div>
              <div className="text-xs font-semibold opacity-90 mt-0.5">{t('stats.kcal')}</div>
            </div>

            <div className={`rounded-2xl p-3 space-y-2 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{t('common.macros')}</p>
              <MacroBar label={t('stats.protein')} value={meal.protein} total={totalMacros} color="#10b981" isDark={isDark} />
              <MacroBar label={t('stats.fat')} value={meal.fat} total={totalMacros} color="#f59e0b" isDark={isDark} />
              <MacroBar label={t('stats.carbs')} value={meal.carbs} total={totalMacros} color="#6366f1" isDark={isDark} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t('stats.protein'), value: meal.protein, color: '#10b981', bg: isDark ? 'bg-green-500/10' : 'bg-green-50' },
                { label: t('stats.fat'), value: meal.fat, color: '#f59e0b', bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50' },
                { label: t('stats.carbs'), value: meal.carbs, color: '#6366f1', bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
                  <div className="text-lg font-black" style={{ color }}>{value}г</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(true)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                  <Pencil size={14} /> {t('common.edit')}
                </button>
                {onFavorite && (
                  <button onClick={() => { onFavorite(meal); onClose(); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${isDark ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>
                    <Star size={14} /> {t('common.add_favorite')}
                  </button>
                )}
              </div>

              {showAddToday && (
                <button onClick={() => { onAddToToday && onAddToToday(meal); onClose(); }}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}>
                  <Plus size={16} strokeWidth={3} /> {t('common.add_to_today_long')}
                </button>
              )}

              {onDelete && (
                <button onClick={() => { onDelete(meal.id); onClose(); }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                  <Trash2 size={14} /> {t('common.delete_record')}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes mealModalUp {
          from { opacity: 0; transform: translateY(50px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>,
    document.body
  );
};