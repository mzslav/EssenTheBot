import { useState, useEffect } from 'react';
import type { TelegramUser, WorkoutPlan, WorkoutPlanWithExercises, PlanExercise, ExerciseFormData, PlanFormData } from '../../types/types';
import { PlansTabSkeleton } from '../../components/Skeleton';
import { useFadeIn } from '../../utils/useFadeIn';
import {
  getPlans, getPlanWithExercises, createPlan, updatePlan, deletePlan, duplicatePlan,
  createPlanExercise, updatePlanExercise, deletePlanExercise,
} from '../../utils/workoutService';

interface PlansTabProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}

const EMPTY_EXERCISE: ExerciseFormData = { name: '', video_url: '', sets: 3, reps: '8-10', weight: 0, rir: '1-2', notes: '' };

const openVideo = (url: string) => {
  if (!url) return;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  const finalUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : url;
  if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(finalUrl);
  else window.open(finalUrl, '_blank');
};

export const PlansTab = ({ user, isDark, themeColor = '#8b5cf6' }: PlansTabProps) => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlanWithExercises | null>(null);
  const [planDetailLoading, setPlanDetailLoading] = useState(false);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState<PlanFormData>({ name: '', muscle_group: '' });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormData>(EMPTY_EXERCISE);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fadeIn = useFadeIn(!loading);

  const loadPlans = async () => {
    if (!user?.id) return;
    try {
      const data = await getPlans(user.id);
      setPlans(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); }, [user?.id]);

  const openPlan = async (planId: number) => {
    setPlanDetailLoading(true);
    try {
      const data = await getPlanWithExercises(planId);
      setSelectedPlan(data);
    } catch (e) { console.error(e); }
    finally { setPlanDetailLoading(false); }
  };

  const handleSavePlan = async () => {
    if (!user?.id || !planForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingPlanId) await updatePlan(editingPlanId, planForm);
      else await createPlan(user.id, planForm);
      setPlanForm({ name: '', muscle_group: '' });
      setShowNewPlanForm(false);
      setEditingPlanId(null);
      await loadPlans();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Видалити цей план?')) return;
    try {
      await deletePlan(planId);
      if (selectedPlan?.id === planId) setSelectedPlan(null);
      await loadPlans();
    } catch (e) { console.error(e); }
  };

  const handleDuplicatePlan = async (planId: number) => {
    if (!user?.id) return;
    try { await duplicatePlan(planId, user.id); await loadPlans(); }
    catch (e) { console.error(e); }
  };

  const handleEditPlan = (plan: WorkoutPlan) => {
    setPlanForm({ name: plan.name, muscle_group: plan.muscle_group ?? '' });
    setEditingPlanId(plan.id);
    setShowNewPlanForm(true);
  };

  const handleSaveExercise = async () => {
    if (!selectedPlan || !exerciseForm.name.trim()) return;
    setSaving(true);
    try {
      const dataToSend = { ...exerciseForm };
      
      if (!dataToSend.video_url || dataToSend.video_url.trim() === '') {
        dataToSend.video_url = undefined;
      }
      if (editingExerciseId) await updatePlanExercise(editingExerciseId, dataToSend);
      else await createPlanExercise(selectedPlan.id, dataToSend);
      setExerciseForm(EMPTY_EXERCISE);
      setShowExerciseForm(false);
      setEditingExerciseId(null);
      await openPlan(selectedPlan.id);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleEditExercise = (ex: PlanExercise) => {
    setExerciseForm({ name: ex.name, video_url: ex.video_url ?? '', sets: ex.sets, reps: ex.reps, weight: ex.weight, rir: ex.rir, notes: ex.notes ?? '' });
    setEditingExerciseId(ex.id);
    setShowExerciseForm(true);
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!selectedPlan) return;
    try { await deletePlanExercise(exerciseId); await openPlan(selectedPlan.id); }
    catch (e) { console.error(e); }
  };

  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-white/10 text-white placeholder:text-white/30 focus:bg-white/15' : 'bg-slate-100 text-slate-900 placeholder:text-slate-400 focus:bg-slate-200'}`;
  const labelClass = `block text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`;

  if (selectedPlan) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedPlan(null); setShowExerciseForm(false); }} className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex-1">
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPlan.name}</h2>
            {selectedPlan.muscle_group && <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{selectedPlan.muscle_group}</p>}
          </div>
          <button onClick={() => { setShowExerciseForm(true); setEditingExerciseId(null); setExerciseForm(EMPTY_EXERCISE); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: themeColor }}>
            + Вправа
          </button>
        </div>

        {planDetailLoading ? <PlansTabSkeleton isDark={isDark} /> : (
          <>
            {showExerciseForm && (
              <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{editingExerciseId ? 'Редагувати вправу' : 'Нова вправа'}</p>
                <div>
                  <label className={labelClass}>Назва *</label>
                  <input className={inputClass} placeholder="Barbell Bench Press" value={exerciseForm.name} onChange={e => setExerciseForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Посилання на відео</label>
                  </div>
                  <input className={inputClass} placeholder="https://youtube.com/..." value={exerciseForm.video_url} onChange={e => setExerciseForm(p => ({ ...p, video_url: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className={labelClass}>Підходи</label><input type="number" className={inputClass} value={exerciseForm.sets} onChange={e => setExerciseForm(p => ({ ...p, sets: parseInt(e.target.value) || 1 }))} /></div>
                  <div><label className={labelClass}>Повторення</label><input className={inputClass} placeholder="8-10" value={exerciseForm.reps} onChange={e => setExerciseForm(p => ({ ...p, reps: e.target.value }))} /></div>
                  <div><label className={labelClass}>Вага (кг)</label><input type="number" className={inputClass} value={exerciseForm.weight} onChange={e => setExerciseForm(p => ({ ...p, weight: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <div>
                  <label className={labelClass}>RIR</label>
                  <select className={inputClass} value={exerciseForm.rir} onChange={e => setExerciseForm(p => ({ ...p, rir: e.target.value }))}>
                    {['0', '1', '1-2', '2', '2-3', '3'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Нотатка</label>
                  <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Тримай лопатки зведені..." value={exerciseForm.notes} onChange={e => setExerciseForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowExerciseForm(false); setEditingExerciseId(null); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>Скасувати</button>
                  <button onClick={handleSaveExercise} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: themeColor }}>{saving ? '…' : 'Зберегти'}</button>
                </div>
              </div>
            )}
            {(selectedPlan.exercises ?? []).length === 0 ? (
              <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Немає вправ. Додай першу!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(selectedPlan.exercises ?? []).map((ex, idx) => (
                  <div key={ex.id} className={`rounded-2xl border p-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center ${isDark ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span>
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{ex.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 ml-7">
                          <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{ex.sets} × {ex.reps} повт</span>
                          <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{ex.weight} кг</span>
                          <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-slate-400'}`}>RIR {ex.rir}</span>
                        </div>
                        {ex.notes && <p className={`text-[10px] mt-1.5 ml-7 italic ${isDark ? 'text-white/30' : 'text-slate-400'}`}>📝 {ex.notes}</p>}
                        {ex.video_url && (
                          <button onClick={() => openVideo(ex.video_url!)} className="inline-flex items-center gap-1 mt-1.5 ml-7 text-[10px] text-red-500 hover:text-red-400 transition-colors">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>
                            Відео
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleEditExercise(ex)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${isDark ? 'bg-white/10 hover:bg-white/15 text-white/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}>✏️</button>
                        <button onClick={() => handleDeleteExercise(ex.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${isDark ? 'bg-white/10 hover:bg-red-500/20 text-white/70' : 'bg-slate-100 hover:bg-red-50 text-slate-500'}`}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (loading) return <PlansTabSkeleton isDark={isDark} />;

  return (
    <div className="space-y-3">
      <div style={fadeIn.style(0)}>
        <button onClick={() => { setShowNewPlanForm(true); setEditingPlanId(null); setPlanForm({ name: '', muscle_group: '' }); }}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98] shadow-lg" style={{ background: themeColor }}>
          + Новий план
        </button>
      </div>

      {showNewPlanForm && (
        <div style={fadeIn.style(1)} className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{editingPlanId ? 'Редагувати план' : 'Новий план'}</p>
          <div><label className={labelClass}>Назва *</label><input className={inputClass} placeholder="Наприклад: Груди, Спина А..." value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className={labelClass}>Група м'язів</label><input className={inputClass} placeholder="Груди, Спина, Ноги..." value={planForm.muscle_group} onChange={e => setPlanForm(p => ({ ...p, muscle_group: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button onClick={() => { setShowNewPlanForm(false); setEditingPlanId(null); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>Скасувати</button>
            <button onClick={handleSavePlan} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: themeColor }}>{saving ? '…' : 'Зберегти'}</button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div style={fadeIn.style(1)} className={`rounded-2xl p-8 text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <span className="text-4xl block mb-3">📋</span>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Немає планів. Створи перший!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan, idx) => (
            <div key={plan.id} style={fadeIn.style(idx + 1)} className={`rounded-2xl border p-4 transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <button className="flex-1 text-left" onClick={() => openPlan(plan.id)}>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</p>
                  {plan.muscle_group && <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{plan.muscle_group}</p>}
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-slate-300'}`}>Оновлено: {new Date(plan.updated_at).toLocaleDateString('uk-UA')}</p>
                </button>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleEditPlan(plan)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'}`}>✏️</button>
                  <button onClick={() => handleDuplicatePlan(plan.id)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'}`}>📋</button>
                  <button onClick={() => handleDeletePlan(plan.id)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isDark ? 'bg-white/10 hover:bg-red-500/20' : 'bg-slate-100 hover:bg-red-50'}`}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};