import { useState, useEffect } from 'react';
import type { FormData, TelegramUser } from '../types/types';
import supabase from '../supabase/supabase-client';
import { ProfileScreenSkeleton } from '../components/Skeleton';
import { useFadeIn } from '../utils/useFadeIn';
import { WeightTracker } from '../components/WeightTracker';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon, Activity, Target, Droplets, Utensils,
  ChevronRight, Pencil, Scale, Flame, Check
} from 'lucide-react';

interface ResultsScreenProps {
  isDark: boolean;
  themeColor?: string;
  formData: FormData;
  user?: TelegramUser;
  onComplete: () => void;
}

const GOAL_OPTIONS = [
  { id: 'lose', label: 'Схуднення', desc: '-300–500 ккал', fullValue: 'Схуднути (-300–500 ккал) 🔥', icon: <Target size={18} /> },
  { id: 'maintain', label: 'Підтримка', desc: '±100 ккал', fullValue: 'Підтримувати форму (±100 ккал)', icon: <Scale size={18} /> },
  { id: 'gain', label: 'Набір маси', desc: '+300–500 ккал', fullValue: "Набрати м'язи (+300–500 ккал) 💪", icon: <Flame size={18} /> },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Сидячий', desc: 'Офіс, мало руху', fullValue: 'Сидячий (офіс, мало руху) 🪑', icon: <UserIcon size={18} /> },
  { id: 'light', label: 'Легка', desc: '1–3 трен/тиждень', fullValue: 'Легка активність (1–3 трен/тиждень) 🚶', icon: <Activity size={18} /> },
  { id: 'moderate', label: 'Середня', desc: '3–5 тренувань', fullValue: 'Середня (3–5 тренувань) 🏃', icon: <Activity size={18} /> },
  { id: 'high', label: 'Висока', desc: '6–7 тренувань', fullValue: 'Висока (6–7 тренувань) 🔥', icon: <Flame size={18} /> },
];

export const ResultsScreen = ({ isDark, themeColor = '#8b5cf6', formData: initialData, user, onComplete }: ResultsScreenProps) => {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [notifyWater, setNotifyWater] = useState(false);
  const [notifyMeals, setNotifyMeals] = useState(false);
  const [activeModal, setActiveModal] = useState<'physical' | 'goal' | 'activity' | null>(null);

  const fadeIn = useFadeIn(!isLoadingData);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) { setIsLoadingData(false); return; }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') console.error('Error:', error);

        if (data) {
          let activityStr = ACTIVITY_OPTIONS[0].fullValue;
          const m = data.multiplier;
          if (m >= 1.725) activityStr = ACTIVITY_OPTIONS[3].fullValue;
          else if (m >= 1.55) activityStr = ACTIVITY_OPTIONS[2].fullValue;
          else if (m >= 1.375) activityStr = ACTIVITY_OPTIONS[1].fullValue;

          setFormData(prev => ({
            ...prev,
            weight: data.weight || prev.weight,
            height: data.height || prev.height,
            age: data.age || prev.age,
            gender: data.gender || prev.gender,
            goal: data.goal || prev.goal,
            activity: activityStr,
            notifications: data.notification ? 'Так' : 'Ні',
          }));
          setNotifyWater(data.notify_water || false);
          setNotifyMeals(data.notify_meals || false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchUserData();
  }, [user?.id]);

  const handleChange = (key: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (closeModal = false): Promise<boolean> => {
    if (!user?.id) return false;
    setIsSaving(true);
    try {
      const weight = Number(formData.weight);
      const height = Number(formData.height);
      const age = Number(formData.age);
      const gender = formData.gender || 'Чоловік 👨';
      const activityStr = formData.activity as string;
      const goalStr = formData.goal as string;

      let activityMultiplier = 1.2;
      if (activityStr.includes('Сидячий')) activityMultiplier = 1.2;
      else if (activityStr.includes('Легка')) activityMultiplier = 1.375;
      else if (activityStr.includes('Середня')) activityMultiplier = 1.55;
      else if (activityStr.includes('Висока')) activityMultiplier = 1.725;

      let goalKey = 'maintain';
      if (goalStr.includes('Схуднути') || goalStr.includes('Схуднення')) goalKey = 'lose';
      else if (goalStr.includes('Набрати') || goalStr.includes('Набір')) goalKey = 'gain';

      let BMR = gender.includes('Чоловік') || gender.includes('👨')
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
      BMR = Math.round(BMR);

      const TDEE_Normal = Math.round(BMR * activityMultiplier);
      let TDEE = TDEE_Normal;

      if (goalKey === 'gain') {
        TDEE = TDEE_Normal + 400;
      } else if (goalKey === 'lose') {
        const minSafe = (gender.includes('Чоловік') || gender.includes('👨')) ? 1600 : 1300;
        const deficit = Math.min(500, Math.max(0, TDEE_Normal - minSafe));
        TDEE = TDEE_Normal - deficit;
      }
      TDEE = Math.round(TDEE);

      const protein_Normal = Math.round(weight * 1.6);
      const fat_Normal = Math.round(weight * 0.9);
      const carbs_Normal = Math.max(50, Math.round((TDEE_Normal - (protein_Normal * 4 + fat_Normal * 9)) / 4));

      let protein = protein_Normal;
      let fat = fat_Normal;
      let carbs = carbs_Normal;

      if (goalKey === 'gain') { protein = Math.round(weight * 2.0); fat = Math.round(weight * 1.0); }
      else if (goalKey === 'lose') { protein = Math.round(weight * 2.1); fat = Math.round(weight * 0.9); }

      fat = Math.max(fat, Math.round((TDEE * 0.20) / 9));
      carbs = Math.max(20, Math.round((TDEE - (protein * 4 + fat * 9)) / 4));

      protein = Math.round(protein / 5) * 5;
      fat = Math.round(fat / 5) * 5;
      carbs = Math.round(carbs / 5) * 5;

      const waterPerDay = Math.min(Math.max(weight * 33, 2000), 4500);
      const BMI = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
      const BMICategory = BMI < 18.5 ? 'Недостатня вага' : BMI < 25 ? 'Норма' : BMI < 30 ? 'Надмірна вага' : 'Ожиріння';

      const { error } = await supabase.from('users').upsert({
        telegram_user_id: user.id,
        first_name: user.first_name,
        username: user.username || '',
        gender, age, weight, height,
        goal: goalStr,
        multiplier: activityMultiplier,
        notification: formData.notifications === 'Так',
        TDEE_Normal, TDEE,
        protein_Normal, protein,
        fat_Normal, fat,
        carbs_Normal, carbs,
        waterPerDay, BMI, BMICategory,
        notify_water: notifyWater,
        notify_meals: notifyMeals,
      }, { onConflict: 'telegram_user_id' });

      if (error) throw error;
      if (closeModal) setActiveModal(null);
      return true;

    } catch (error: any) {
      alert(`Помилка: ${error.message}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isLoadingData && user?.id) {
      handleSave();
    }
  }, [notifyWater, notifyMeals]);


  if (isLoadingData) return <ProfileScreenSkeleton isDark={isDark} />;

  const SettingRow = ({ icon, label, value, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 bg-transparent border-b last:border-b-0 ${isDark ? 'border-zinc-800/50 hover:bg-zinc-800/30' : 'border-zinc-100 hover:bg-zinc-50'} transition-colors`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{value}</span>
        <ChevronRight size={16} className={isDark ? 'text-zinc-600' : 'text-zinc-300'} />
      </div>
    </button>
  );

  const ToggleRow = ({ icon, label, desc, state, toggle }: any) => (
    <div className={`w-full flex items-center justify-between p-4 bg-transparent border-b last:border-b-0 ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>{label}</p>
          <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{desc}</p>
        </div>
      </div>
      <button
        onClick={toggle}
        className={`w-12 h-7 rounded-full transition-all duration-300 relative ${state ? '' : isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}
        style={state ? { background: themeColor } : {}}
      >
        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${state ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-md pb-8 px-2">
      <div style={fadeIn.style(0)} className="flex flex-col items-center justify-center pt-6 pb-8">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden shadow-xl" style={{ border: `2px solid ${isDark ? '#27272a' : '#f4f4f5'}` }}>
            {user?.photo_url ? (
              <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: themeColor, color: '#fff' }}>
                {user?.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 ${isDark ? 'border-zinc-950 bg-zinc-800' : 'border-zinc-50 bg-white'} text-zinc-400`}>
            <Pencil size={14} />
          </div>
        </div>
        <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{user?.first_name} {user?.last_name}</h1>
        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>@{user?.username || 'user'}</p>
      </div>

      <div className="space-y-6">

        <div style={fadeIn.style(1)}>
          <h2 className={`px-4 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Особисті дані</h2>
          <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200/50 shadow-sm'}`}>
            <SettingRow
              icon={<UserIcon size={18} />}
              label="Фізичні показники"
              value={`${formData.weight} кг, ${formData.height} см`}
              onClick={() => setActiveModal('physical')}
            />
            <SettingRow
              icon={<Target size={18} />}
              label="Поточна мета"
              value={GOAL_OPTIONS.find(g => formData.goal?.includes(g.label))?.label || 'Підтримка'}
              onClick={() => setActiveModal('goal')}
            />
            <SettingRow
              icon={<Activity size={18} />}
              label="Активність"
              value={ACTIVITY_OPTIONS.find(a => formData.activity?.includes(a.label))?.label || 'Сидяча'}
              onClick={() => setActiveModal('activity')}
            />
          </div>
        </div>

        <div style={fadeIn.style(2)}>
          <h2 className={`px-4 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Сповіщення</h2>
          <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200/50 shadow-sm'}`}>
            <ToggleRow
              icon={<Droplets size={18} />}
              label="Нагадування про воду"
              desc="Кожні 3 години (9:00–21:00)"
              state={notifyWater}
              toggle={() => setNotifyWater(!notifyWater)}
            />
            <ToggleRow
              icon={<Utensils size={18} />}
              label="Нагадування про їжу"
              desc="Обід (13:00) та вечеря (19:00)"
              state={notifyMeals}
              toggle={() => setNotifyMeals(!notifyMeals)}
            />
          </div>
        </div>

        <div style={fadeIn.style(3)}>
          <WeightTracker user={user} isDark={isDark} themeColor={themeColor} />
        </div>

        {Object.keys(initialData).length > 0 && (
          <div style={fadeIn.style(4)} className="pt-4">
            <button
              onClick={async () => {
                const success = await handleSave();
                if (success) onComplete();
              }}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-transform active:scale-95 hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}
            >
              Почати роботу
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed bottom-0 left-0 right-0 z-[101] p-6 rounded-t-3xl border-t ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'}`}
            >
              <div className="w-12 h-1.5 rounded-full bg-zinc-500/30 mx-auto mb-6" />

              {activeModal === 'physical' && (
                <div>
                  <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Фізичні показники</h3>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Вік</label>
                        <input type="number" value={formData.age as number} onChange={(e) => handleChange('age', e.target.value)}
                          className={`w-full p-4 rounded-2xl text-lg font-bold border focus:outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Вага (кг)</label>
                        <input type="number" value={formData.weight as number} onChange={(e) => handleChange('weight', e.target.value)}
                          className={`w-full p-4 rounded-2xl text-lg font-bold border focus:outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Зріст (см)</label>
                      <input type="number" value={formData.height as number} onChange={(e) => handleChange('height', e.target.value)}
                        className={`w-full p-4 rounded-2xl text-lg font-bold border focus:outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
                    </div>
                  </div>
                  <button onClick={() => handleSave(true)} disabled={isSaving} className="w-full py-4 rounded-2xl text-white font-bold transition-transform active:scale-95" style={{ backgroundColor: themeColor }}>
                    {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                  </button>
                </div>
              )}

              {activeModal === 'goal' && (
                <div>
                  <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Мета</h3>
                  <div className="space-y-3 mb-8">
                    {GOAL_OPTIONS.map(opt => {
                      const isSelected = (formData.goal as string)?.includes(opt.label);
                      return (
                        <button key={opt.id} onClick={() => { handleChange('goal', opt.fullValue); handleSave(true); }}
                          className={`w-full flex items-center p-4 rounded-2xl border transition-all ${isSelected ? isDark ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-400 bg-zinc-100' : isDark ? 'border-zinc-800 bg-transparent' : 'border-zinc-200 bg-transparent'}`}
                          style={isSelected ? { borderColor: themeColor } : {}}
                        >
                          <div className={`p-2 rounded-xl mr-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} style={isSelected ? { color: themeColor } : {}}>{opt.icon}</div>
                          <div className="text-left flex-1">
                            <p className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{opt.label}</p>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{opt.desc}</p>
                          </div>
                          {isSelected && <Check size={20} style={{ color: themeColor }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeModal === 'activity' && (
                <div>
                  <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Рівень активності</h3>
                  <div className="space-y-3 mb-8">
                    {ACTIVITY_OPTIONS.map(opt => {
                      const isSelected = (formData.activity as string)?.includes(opt.label);
                      return (
                        <button key={opt.id} onClick={() => { handleChange('activity', opt.fullValue); handleSave(true); }}
                          className={`w-full flex items-center p-4 rounded-2xl border transition-all ${isSelected ? isDark ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-400 bg-zinc-100' : isDark ? 'border-zinc-800 bg-transparent' : 'border-zinc-200 bg-transparent'}`}
                          style={isSelected ? { borderColor: themeColor } : {}}
                        >
                          <div className={`p-2 rounded-xl mr-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} style={isSelected ? { color: themeColor } : {}}>{opt.icon}</div>
                          <div className="text-left flex-1">
                            <p className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{opt.label}</p>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{opt.desc}</p>
                          </div>
                          {isSelected && <Check size={20} style={{ color: themeColor }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};