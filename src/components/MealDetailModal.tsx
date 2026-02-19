import { createPortal } from 'react-dom'; // 1. Додаємо імпорт
import type { MealRecord } from '../utils/supabaseService';

interface MealDetailModalProps {
  meal: MealRecord;
  isDark: boolean;
  themeColor: string;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onAddToToday?: (meal: MealRecord) => void;
  isToday?: boolean;
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDisplayTime(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

const MacroBar = ({
  label, value, total, color, isDark,
}: { label: string; value: number; total: number; color: string; isDark: boolean }) => {
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
  meal, isDark, themeColor, onClose, onDelete, onAddToToday,
}: MealDetailModalProps) => {
  const totalMacros = meal.protein + meal.fat + meal.carbs;
  const showAddToday = !!onAddToToday;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        style={{ animation: 'mealModalUp 0.35s cubic-bezier(0.34,1.4,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-10 h-1 rounded-full mx-auto ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />

        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: `${themeColor}25` }}
          >
            {meal.emoji || '🍽️'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {meal.name}
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              {meal._date ? formatDisplayDate(meal._date) : ''} · {formatDisplayTime(meal.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${isDark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-400'}`}
          >
            ✕
          </button>
        </div>

        <div
          className="rounded-2xl p-4 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
        >
          <div className="text-5xl font-black tracking-tight">{meal.calories}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">ккал</div>
        </div>

        <div className={`rounded-2xl p-4 space-y-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
            Макронутрієнти
          </p>
          <MacroBar label="Білки"     value={meal.protein} total={totalMacros} color="#10b981" isDark={isDark} />
          <MacroBar label="Жири"      value={meal.fat}     total={totalMacros} color="#f59e0b" isDark={isDark} />
          <MacroBar label="Вуглеводи" value={meal.carbs}   total={totalMacros} color="#6366f1" isDark={isDark} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Білки',     value: meal.protein, color: '#10b981', bg: isDark ? 'bg-green-500/10'  : 'bg-green-50'  },
            { label: 'Жири',      value: meal.fat,     color: '#f59e0b', bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50' },
            { label: 'Вуглеводи', value: meal.carbs,   color: '#6366f1', bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
              <div className="text-xl font-black" style={{ color }}>{value}г</div>
              <div className={`text-[10px] font-semibold mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {showAddToday && (
            <button
              onClick={() => { onAddToToday && onAddToToday(meal); onClose(); }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
            >
              ➕ Додати до сьогоднішнього раціону
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => { onDelete(meal.id); onClose(); }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-red-500 border-2 border-red-500/25 hover:bg-red-500/10 transition-all active:scale-95"
            >
              🗑️ Видалити запис
            </button>
          )}
        </div>
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