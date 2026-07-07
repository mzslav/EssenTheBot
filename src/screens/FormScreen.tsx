import { useState } from 'react';
import type { FormData } from '../types/types';
import { questions } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ChevronLeft, Check, Flame, Dumbbell, Target, 
  Laptop, Footprints, Activity, Zap, Mars, Venus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getIconForOption = (key: string | undefined, isSelected: boolean, isDark: boolean) => {
  if (!key) return null;
  const iconProps = { 
    size: 20, 
    className: `mr-3 ${isSelected ? (isDark ? 'text-zinc-100' : 'text-zinc-900') : (isDark ? 'text-zinc-500' : 'text-zinc-400')}`
  };
  
  if (key.includes('gender.options.male')) return <Mars {...iconProps} />;
  if (key.includes('gender.options.female')) return <Venus {...iconProps} />;
  
  if (key.includes('goal.options.lose')) return <Flame {...iconProps} />;
  if (key.includes('goal.options.gain')) return <Dumbbell {...iconProps} />;
  if (key.includes('goal.options.maintain')) return <Target {...iconProps} />;
  
  if (key.includes('activity.options.sedentary')) return <Laptop {...iconProps} />;
  if (key.includes('activity.options.light')) return <Footprints {...iconProps} />;
  if (key.includes('activity.options.moderate')) return <Activity {...iconProps} />;
  if (key.includes('activity.options.high')) return <Zap {...iconProps} />;
  
  return null;
};

interface FormScreenProps {
  isDark: boolean;
  themeColor?: string;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onComplete: () => void;
}

export const FormScreen = ({ isDark, themeColor = '#8b5cf6', formData, onFormDataChange, onComplete }: FormScreenProps) => {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [direction, setDirection] = useState(1);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion) / questions.length) * 100;

  const handleAnswer = (value: string | number) => {
    onFormDataChange({ ...formData, [question.key]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setDirection(1);
      setCurrentQuestion(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setDirection(-1);
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const canProceed = () => {
    const value = formData[question.key];
    return !question.requiredField || (value !== undefined && value !== '');
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0
    })
  };

  return (
    <div className="w-full max-w-md pb-8">
      <div className="mb-8 pt-4 px-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${currentQuestion === 0 ? 'opacity-0' : isDark ? 'bg-zinc-900 text-zinc-100 border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {t('form.step')} {currentQuestion + 1} {t('form.from')} {questions.length}
          </p>
          <div className="w-10" />
        </div>

        <div className={`h-1.5 ${isDark ? 'bg-zinc-900' : 'bg-zinc-200'} rounded-full overflow-hidden`}>
          <motion.div
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
            style={{ background: themeColor }}
          />
        </div>
      </div>

      <div className="relative min-h-[300px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentQuestion}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="w-full pb-28"
          >
            <h2 className={`text-2xl font-black leading-tight tracking-tight px-4 mb-8 text-center ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {t(question.labelKey || question.fieldLabel)}
            </h2>

            <div className="px-2 space-y-3">
              {question.fieldType === 'radio' && question.fieldOptions && (
                <div className="space-y-3">
                  {question.fieldOptions.values.map((item, idx) => {
                    const isSelected = formData[question.key] === item.option;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(item.option)}
                        className={`w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] flex justify-between items-center border-2 ${isSelected
                            ? isDark ? 'bg-zinc-800 border-transparent shadow-lg' : 'bg-white border-transparent shadow-lg'
                            : isDark
                              ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                              : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          }`}
                        style={isSelected ? { borderColor: themeColor } : {}}
                      >
                        <div className="flex items-center">
                          {getIconForOption(item.optionKey, isSelected, isDark)}
                          <span className={`font-bold text-base ${isSelected ? (isDark ? 'text-zinc-100' : 'text-zinc-900') : (isDark ? 'text-zinc-400' : 'text-zinc-600')}`}>
                            {t(item.optionKey || item.option)}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: themeColor }}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {question.fieldType === 'dropdown' && question.fieldOptions && (
                <div className="relative">
                  <select
                    value={formData[question.key] as string || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    className={`w-full p-5 text-lg font-bold rounded-2xl appearance-none outline-none transition-all border-2 ${isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-zinc-600'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400'
                      }`}
                  >
                    <option value="" disabled>{t('form.choose_option')}</option>
                    {question.fieldOptions.values.map((item, idx) => (
                      <option key={idx} value={item.option}>
                        {t(item.optionKey || item.option)}
                      </option>
                    ))}
                  </select>
                  <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    ▼
                  </div>
                </div>
              )}

              {question.fieldType === 'number' && (
                <div className="relative flex justify-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={question.placeholderKey ? t(question.placeholderKey) : question.placeholder}
                    value={formData[question.key] as number || ''}
                    onChange={(e) => handleAnswer(Number(e.target.value))}
                    className={`w-full max-w-[240px] text-center p-6 text-4xl font-black rounded-3xl outline-none transition-all border-2 placeholder:text-3xl placeholder:font-bold ${isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700/50 focus:border-zinc-600 focus:bg-zinc-800/50'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-300 focus:border-zinc-400 focus:bg-white'
                      }`}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 z-50">
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`w-full max-w-sm mx-auto flex items-center justify-center gap-2 font-bold py-4 px-6 text-base rounded-2xl transition-all duration-300 active:scale-[0.98] ${canProceed()
              ? 'text-white shadow-xl hover:shadow-2xl'
              : isDark
                ? 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
            }`}
          style={canProceed() ? {
            background: themeColor
          } : {}}
        >
          {currentQuestion === questions.length - 1 ? (
            <><Check size={20} strokeWidth={3} /> {t('form.finish')}</>
          ) : (
            <>{t('form.next')} <ChevronRight size={20} strokeWidth={3} /></>
          )}
        </button>
      </div>
    </div>
  );
};