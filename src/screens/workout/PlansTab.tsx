import { useState, useEffect } from 'react';
import type { TelegramUser, WorkoutPlan, WorkoutPlanWithExercises, PlanExercise, ExerciseFormData, PlanFormData } from '../../types/types';
import { PlansTabSkeleton } from '../../components/Skeleton';
import { useFadeIn } from '../../utils/useFadeIn';
import {
  getPlans, getPlanWithExercises, createPlan, updatePlan, deletePlan, duplicatePlan,
  createPlanExercise, updatePlanExercise, deletePlanExercise,
} from '../../utils/workoutService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, ChevronLeft, Pencil, Trash2, Copy, FileText, Dumbbell, Video, Save, X, List
} from 'lucide-react';

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

  const handleEditPlan = (plan: WorkoutPlan, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const inputClass = `w-full px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all outline-none border ${isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white'}`;
  const labelClass = `block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

  if (selectedPlan) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 pb-20">
        
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedPlan(null); setShowExerciseForm(false); }} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-zinc-900 text-zinc-100 border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'}`}>
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedPlan.name}</h2>
            {selectedPlan.muscle_group && <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{selectedPlan.muscle_group}</p>}
          </div>
          <button onClick={() => { setShowExerciseForm(true); setEditingExerciseId(null); setExerciseForm(EMPTY_EXERCISE); }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-md" style={{ background: themeColor }}>
            <Plus size={20} />
          </button>
        </div>

        {planDetailLoading ? <PlansTabSkeleton isDark={isDark} /> : (
          <>
            <AnimatePresence>
              {showExerciseForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className={`rounded-3xl border p-5 space-y-4 mb-4 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       <Dumbbell size={18} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
                       <p className={`font-bold text-base ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{editingExerciseId ? 'Редагувати вправу' : 'Нова вправа'}</p>
                    </div>
                    
                    <div>
                      <label className={labelClass}>Назва *</label>
                      <input className={inputClass} placeholder="Наприклад: Жим лежачи" value={exerciseForm.name} onChange={e => setExerciseForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    
                    <div>
                      <label className={labelClass}>Відео інструкція (YouTube)</label>
                      <input className={inputClass} placeholder="https://youtube.com/..." value={exerciseForm.video_url} onChange={e => setExerciseForm(p => ({ ...p, video_url: e.target.value }))} />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={labelClass}>Підходи</label><input type="number" className={inputClass} value={exerciseForm.sets} onChange={e => setExerciseForm(p => ({ ...p, sets: parseInt(e.target.value) || 1 }))} /></div>
                      <div><label className={labelClass}>Повтори</label><input className={inputClass} placeholder="8-10" value={exerciseForm.reps} onChange={e => setExerciseForm(p => ({ ...p, reps: e.target.value }))} /></div>
                      <div><label className={labelClass}>Вага (кг)</label><input type="number" className={inputClass} value={exerciseForm.weight} onChange={e => setExerciseForm(p => ({ ...p, weight: parseFloat(e.target.value) || 0 }))} /></div>
                    </div>
                    
                    <div>
                      <label className={labelClass}>RIR (Повторення в резерві)</label>
                      <select className={`${inputClass} appearance-none`} value={exerciseForm.rir} onChange={e => setExerciseForm(p => ({ ...p, rir: e.target.value }))}>
                        {['0', '1', '1-2', '2', '2-3', '3'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className={labelClass}>Нотатка</label>
                      <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Важливі деталі техніки..." value={exerciseForm.notes} onChange={e => setExerciseForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setShowExerciseForm(false); setEditingExerciseId(null); }} className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                         <X size={16} /> Скасувати
                      </button>
                      <button onClick={handleSaveExercise} disabled={saving} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2" style={{ background: themeColor }}>
                         <Save size={16} /> {saving ? 'Збереження...' : 'Зберегти'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(selectedPlan.exercises ?? []).length === 0 ? (
              <div className={`rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-dashed ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
                   <List size={28} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                </div>
                <p className={`font-bold text-lg mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Немає вправ</p>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Додай першу вправу, щоб почати формувати тренування</p>
                <button onClick={() => { setShowExerciseForm(true); setEditingExerciseId(null); setExerciseForm(EMPTY_EXERCISE); }} className="mt-4 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95" style={{ background: themeColor }}>
                  + Додати вправу
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(selectedPlan.exercises ?? []).map((ex, idx) => (
                  <div key={ex.id} className={`rounded-3xl p-4 border transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-black w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>{idx + 1}</span>
                          <p className={`font-bold text-base leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{ex.name}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3 ml-10">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>{ex.sets} × {ex.reps}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>{ex.weight} кг</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>RIR {ex.rir}</span>
                        </div>
                        
                        {ex.notes && (
                          <div className="mt-2 ml-10 flex items-start gap-1.5">
                            <FileText size={12} className={`mt-0.5 shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                            <p className={`text-[11px] italic ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{ex.notes}</p>
                          </div>
                        )}
                        
                        {ex.video_url && (
                          <button onClick={() => openVideo(ex.video_url!)} className="inline-flex items-center gap-1.5 mt-2 ml-10 text-[11px] font-bold text-red-500 hover:text-red-400 transition-colors bg-red-500/10 px-2.5 py-1 rounded-lg">
                            <Video size={14} /> Дивитись техніку
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => handleEditExercise(ex)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border border-zinc-100'}`}>
                           <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteExercise(ex.id)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-500'}`}>
                           <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    );
  }

  if (loading) return <PlansTabSkeleton isDark={isDark} />;

  return (
    <div className="space-y-4 pb-20">
      
      {/* Header and Add Button */}
      <div style={fadeIn.style(0)}>
        <button onClick={() => { setShowNewPlanForm(true); setEditingPlanId(null); setPlanForm({ name: '', muscle_group: '' }); }}
          className="w-full py-4 rounded-3xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2" style={{ background: themeColor }}>
          <Plus size={18} strokeWidth={3} /> Створити новий план
        </button>
      </div>

      <AnimatePresence>
        {showNewPlanForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className={`rounded-3xl border p-5 space-y-4 mb-4 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
              <div className="flex items-center gap-2 mb-2">
                 <FileText size={18} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
                 <p className={`font-bold text-base ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{editingPlanId ? 'Редагувати план' : 'Новий план тренувань'}</p>
              </div>
              
              <div>
                <label className={labelClass}>Назва плану *</label>
                <input className={inputClass} placeholder="Наприклад: Full Body, День ніг..." value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              
              <div>
                <label className={labelClass}>Група м'язів (необов'язково)</label>
                <input className={inputClass} placeholder="Наприклад: Спина + Біцепс" value={planForm.muscle_group} onChange={e => setPlanForm(p => ({ ...p, muscle_group: e.target.value }))} />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowNewPlanForm(false); setEditingPlanId(null); }} className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                   <X size={16} /> Скасувати
                </button>
                <button onClick={handleSavePlan} disabled={saving} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2" style={{ background: themeColor }}>
                   <Save size={16} /> {saving ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {plans.length === 0 ? (
        <div style={fadeIn.style(1)} className={`rounded-3xl p-10 text-center border border-dashed ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
             <Dumbbell size={28} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          </div>
          <p className={`font-bold text-lg mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Немає планів</p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Створи свій перший план тренувань, щоб додати в нього вправи.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan, idx) => (
            <motion.div key={plan.id} style={fadeIn.style(idx + 1)} className={`rounded-3xl border p-5 transition-all active:scale-[0.98] cursor-pointer ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 shadow-sm hover:border-zinc-300'}`} onClick={() => openPlan(plan.id)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className={`font-black text-lg ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{plan.name}</h3>
                  {plan.muscle_group && <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{plan.muscle_group}</p>}
                  <p className={`text-[10px] font-semibold mt-2 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Оновлено: {new Date(plan.updated_at).toLocaleDateString('uk-UA')}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={(e) => handleEditPlan(plan, e)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-300' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-700 border border-zinc-100'}`}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDuplicatePlan(plan.id); }} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-300' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-700 border border-zinc-100'}`}>
                    <Copy size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};