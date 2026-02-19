import { useState, useEffect } from 'react';
import type { FormData, TelegramUser } from '../types/types';
import supabase from '../supabase/supabase-client';
import { ProfileScreenSkeleton } from '../components/Skeleton';
import { useFadeIn } from '../utils/useFadeIn';

interface ResultsScreenProps {
  isDark: boolean;
  themeColor?: string;
  formData: FormData;
  user?: TelegramUser;
  onComplete: () => void;
}

const GOAL_OPTIONS = [
  { id: 'lose',     label: 'Схуднення',   desc: '-300–500 ккал 🔥', fullValue: 'Схуднути (-300–500 ккал) 🔥' },
  { id: 'maintain', label: 'Підтримка',   desc: '±100 ккал ⚖️',     fullValue: 'Підтримувати форму (±100 ккал)' },
  { id: 'gain',     label: 'Набір маси',  desc: '+300–500 ккал 💪',  fullValue: "Набрати м'язи (+300–500 ккал) 💪" },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Сидячий', icon: '🪑', desc: 'Офіс, мало руху',      fullValue: 'Сидячий (офіс, мало руху) 🪑' },
  { id: 'light',     label: 'Легка',   icon: '🚶', desc: '1–3 трен/тиждень',    fullValue: 'Легка активність (1–3 трен/тиждень) 🚶' },
  { id: 'moderate',  label: 'Середня', icon: '🏃', desc: '3–5 тренувань',        fullValue: 'Середня (3–5 тренувань) 🏃' },
  { id: 'high',      label: 'Висока',  icon: '🔥', desc: '6–7 тренувань',        fullValue: 'Висока (6–7 тренувань) 🔥' },
];

export const ResultsScreen = ({ isDark, themeColor = '#8b5cf6', formData: initialData, user, onComplete }: ResultsScreenProps) => {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

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

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const weight = Number(formData.weight);
      const height = Number(formData.height);
      const age = Number(formData.age);
      const gender = formData.gender || 'Чоловік';
      const activityStr = formData.activity as string;
      const goalStr = formData.goal as string;

      let activityMultiplier = 1.2;
      if (activityStr.includes('Сидячий'))  activityMultiplier = 1.2;
      else if (activityStr.includes('Легка'))   activityMultiplier = 1.375;
      else if (activityStr.includes('Середня')) activityMultiplier = 1.55;
      else if (activityStr.includes('Висока'))  activityMultiplier = 1.725;

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
      fat     = Math.round(fat / 5) * 5;
      carbs   = Math.round(carbs / 5) * 5;

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
      }, { onConflict: 'telegram_user_id' });

      if (error) throw error;
      onComplete();
    } catch (error: any) {
      alert(`Помилка: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData || isSaving) return <ProfileScreenSkeleton isDark={isDark} />;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
      {children}
    </h3>
  );

  const StatInput = ({ label, value, onChange, suffix }: any) => (
    <div className={`flex-1 p-3 rounded-2xl border transition-all focus-within:ring-2 ${isDark ? 'bg-white/5 border-white/10 focus-within:ring-white/20' : 'bg-slate-50 border-slate-100 focus-within:ring-purple-200'}`}>
      <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{label}</label>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-transparent p-0 text-lg font-bold focus:outline-none ${isDark ? 'text-white placeholder:text-white/20' : 'text-slate-900 placeholder:text-slate-300'}`}
        />
        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 w-full max-w-md">
      <div style={fadeIn.style(0)} className="text-center mb-4 pt-2">
        <div
          className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl shadow-2xl relative"
          style={{ background: `linear-gradient(135deg, ${themeColor}20, ${themeColor}40)` }}
        >
          {user?.photo_url ? (
            <img src={user.photo_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span style={{ color: themeColor }}>{user?.first_name?.[0]?.toUpperCase() || 'U'}</span>
          )}
          <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-4 ${isDark ? 'border-slate-900 bg-slate-800' : 'border-slate-100 bg-white'}`}>
            ✏️
          </div>
        </div>
        <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Мій Профіль</h1>
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Налаштуйте свої параметри</p>
      </div>

      <div style={fadeIn.style(1)} className="mb-3">
        <div className={`grid grid-cols-2 gap-1 p-1 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-100'}`}>
          {['Чоловік 👨', 'Жінка 👩'].map(opt => {
            const isActive = (formData.gender || 'Чоловік 👨') === opt;
            return (
              <button
                key={opt}
                onClick={() => handleChange('gender', opt)}
                className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? isDark ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-900 shadow-sm'
                    : isDark ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div style={fadeIn.style(2)} className={`backdrop-blur-xl rounded-3xl p-6 shadow-xl border ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-white/50'}`}>
        <div className="mb-8">
          <SectionTitle>Фізичні дані</SectionTitle>
          <div className="flex gap-3">
            <StatInput label="Вік"   value={formData.age}    onChange={(v: any) => handleChange('age', v)}    suffix="років" />
            <StatInput label="Вага"  value={formData.weight} onChange={(v: any) => handleChange('weight', v)} suffix="кг" />
            <StatInput label="Зріст" value={formData.height} onChange={(v: any) => handleChange('height', v)} suffix="см" />
          </div>
        </div>

        <div className="mb-8">
          <SectionTitle>Мета</SectionTitle>
          <div className="grid grid-cols-1 gap-3">
            {GOAL_OPTIONS.map(opt => {
              const isSelected = (formData.goal as string)?.includes(opt.label) || formData.goal === opt.fullValue;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChange('goal', opt.fullValue)}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 active:scale-[0.98] ${
                    isSelected ? '' : isDark ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}
                  style={isSelected ? { borderColor: themeColor, backgroundColor: `${themeColor}15` } : {}}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{opt.label}</div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{opt.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white" style={{ background: themeColor }}>✓</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <SectionTitle>Активність</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {ACTIVITY_OPTIONS.map(opt => {
              const isSelected = (formData.activity as string)?.includes(opt.label);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChange('activity', opt.fullValue)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all duration-300 active:scale-[0.98] h-full ${
                    isSelected ? '' : isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'
                  }`}
                  style={isSelected ? { borderColor: themeColor, backgroundColor: `${themeColor}15` } : {}}
                >
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{opt.label}</div>
                  <div className={`text-[10px] mt-1 leading-tight ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-purple-500/30 transition-all active:scale-95 hover:shadow-xl"
          style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}
        >
          Зберегти
        </button>
      </div>
    </div>
  );
};