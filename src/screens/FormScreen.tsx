// FormScreen.tsx
import { useState } from 'react';
import type { FormData } from '../types/types';
import { questions } from '../data';

interface FormScreenProps {
  isDark: boolean;
  themeColor?: string;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onComplete: () => void;
}

export const FormScreen = ({ isDark, themeColor = '#8b5cf6', formData, onFormDataChange, onComplete }: FormScreenProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: string | number) => {
    onFormDataChange({ ...formData, [question.key]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const canProceed = () => {
    const value = formData[question.key];
    return !question.requiredField || (value !== undefined && value !== '');
  };

  return (
    <div className="relative z-10 w-full max-w-md">
      <div className="mb-5">
        <div className={`h-1.5 ${isDark ? 'bg-white/10' : 'bg-slate-300'} rounded-full overflow-hidden`}>
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${themeColor}, #6366f1)`
            }}
          ></div>
        </div>
        <p className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-600'} mt-2 text-center`}>
          Питання {currentQuestion + 1} з {questions.length}
        </p>
      </div>

      <div className={`${isDark ? 'bg-white/5' : 'bg-white/80'} backdrop-blur-2xl rounded-2xl p-6 border ${isDark ? 'border-white/10' : 'border-purple-200'} shadow-xl`}>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-5`}>
          {question.fieldLabel}
        </h2>

        {question.fieldType === 'radio' && question.fieldOptions && (
          <div className="space-y-2.5">
            {question.fieldOptions.values.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(item.option)}
                className={`w-full p-3 rounded-xl text-sm text-left transition-all duration-200 ${
                  formData[question.key] === item.option
                    ? 'text-white shadow-md scale-[1.01]'
                    : isDark 
                      ? 'bg-white/5 text-white hover:bg-white/10' 
                      : 'bg-white text-slate-900 hover:bg-slate-50 border border-purple-200'
                }`}
                style={formData[question.key] === item.option ? {
                  background: `linear-gradient(135deg, ${themeColor}, #6366f1)`
                } : {}}
              >
                {item.option}
              </button>
            ))}
          </div>
        )}

        {question.fieldType === 'dropdown' && question.fieldOptions && (
          <select
            value={formData[question.key] as string || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            className={`w-full p-3 text-sm rounded-xl ${
              isDark 
                ? 'bg-white/5 text-white border-white/10' 
                : 'bg-white text-slate-900 border-purple-200'
            } border focus:outline-none focus:ring-1`}
            style={{ 
              '--tw-ring-color': themeColor 
            } as React.CSSProperties}
          >
            <option value="">Обери варіант</option>
            {question.fieldOptions.values.map((item, idx) => (
              <option key={idx} value={item.option}>
                {item.option}
              </option>
            ))}
          </select>
        )}

        {question.fieldType === 'number' && (
          <input
            type="number"
            placeholder={question.placeholder}
            value={formData[question.key] as number || ''}
            onChange={(e) => handleAnswer(Number(e.target.value))}
            className={`w-full p-3 text-sm rounded-xl ${
              isDark 
                ? 'bg-white/5 text-white border-white/10 placeholder-white/40' 
                : 'bg-white text-slate-900 border-purple-200 placeholder-slate-400'
            } border focus:outline-none focus:ring-1`}
            style={{ 
              '--tw-ring-color': themeColor 
            } as React.CSSProperties}
          />
        )}

        <div className="mt-6 flex gap-2.5">
          {currentQuestion > 0 && (
            <button
              onClick={handlePrevious}
              className={`flex-1 ${
                isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-900'
              } font-semibold py-3 px-4 text-sm rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]`}
            >
              Назад
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex-1 font-semibold py-3 px-4 text-sm rounded-xl transition-all duration-200 ${
              canProceed()
                ? 'text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                : isDark
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            style={canProceed() ? {
              background: `linear-gradient(135deg, ${themeColor}, #6366f1)`
            } : {}}
          >
            {currentQuestion === questions.length - 1 ? 'Завершити' : 'Далі'}
          </button>
        </div>
      </div>
    </div>
  );
};