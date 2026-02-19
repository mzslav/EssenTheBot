import { useState } from 'react';
import type { AIResponse } from '../types/types';

interface AIResponseSectionProps {
  aiResponse: AIResponse;
  isDark: boolean;
  themeColor: string;
  onSubmitWithClarifications: (answers: string[]) => void;
  onSubmitWithout: () => void;
  isProcessing?: boolean;
}

export const AIResponseSection = ({
  aiResponse,
  isDark,
  themeColor,
  onSubmitWithClarifications,
  onSubmitWithout,
  isProcessing = false
}: AIResponseSectionProps) => {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [editedMacros, setEditedMacros] = useState({
    calories: aiResponse.calories,
    protein: aiResponse.protein,
    fat: aiResponse.fat,
    carbs: aiResponse.carbs
  });

  const handleClarifyingAnswer = (questionIndex: number, answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleMacroChange = (field: keyof typeof editedMacros, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedMacros(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSubmitWithEdits = () => {
    const updatedResponse: AIResponse = {
      ...aiResponse,
      ...editedMacros
    };
    
    console.log('Відправка з відредагованими даними:', updatedResponse);
    onSubmitWithout();
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <div 
        className="rounded-3xl p-5 text-white relative overflow-hidden shadow-xl"
        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)` }}
      >
        <div className="absolute top-[-30%] right-[-20%] w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-30%] left-[-15%] w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <p className="text-[10px] font-semibold text-white/70 mb-2 uppercase tracking-wide">
            AI розпізнав:
          </p>
          <h3 className="text-lg font-bold mb-4 text-white">{aiResponse.name}</h3>
          
          <div className="grid grid-cols-4 gap-3 mb-2">
            <div className="text-center">
              <input
                type="number"
                value={editedMacros.calories}
                onChange={(e) => handleMacroChange('calories', e.target.value)}
                className="w-full text-2xl font-black bg-white/20 rounded-lg px-2 py-1 text-center text-white placeholder-white/50 border-2 border-white/30 focus:border-white focus:outline-none transition-all"
              />
              <div className="text-[9px] text-white/70 font-medium mt-0.5">ккал</div>
            </div>
            <div className="text-center">
              <input
                type="number"
                value={editedMacros.protein}
                onChange={(e) => handleMacroChange('protein', e.target.value)}
                className="w-full text-2xl font-black bg-green-500/30 rounded-lg px-2 py-1 text-center text-white placeholder-white/50 border-2 border-green-400/50 focus:border-green-300 focus:outline-none transition-all"
              />
              <div className="text-[9px] text-white/70 font-medium mt-0.5">білки</div>
            </div>
            <div className="text-center">
              <input
                type="number"
                value={editedMacros.fat}
                onChange={(e) => handleMacroChange('fat', e.target.value)}
                className="w-full text-2xl font-black bg-yellow-500/30 rounded-lg px-2 py-1 text-center text-white placeholder-white/50 border-2 border-yellow-400/50 focus:border-yellow-300 focus:outline-none transition-all"
              />
              <div className="text-[9px] text-white/70 font-medium mt-0.5">жири</div>
            </div>
            <div className="text-center">
              <input
                type="number"
                value={editedMacros.carbs}
                onChange={(e) => handleMacroChange('carbs', e.target.value)}
                className="w-full text-2xl font-black bg-blue-500/30 rounded-lg px-2 py-1 text-center text-white placeholder-white/50 border-2 border-blue-400/50 focus:border-blue-300 focus:outline-none transition-all"
              />
              <div className="text-[9px] text-white/70 font-medium mt-0.5">вуглев.</div>
            </div>
          </div>
          
          <p className="text-[9px] text-white/50 text-center mt-2">
            Натисни на цифри щоб змінити значення
          </p>
        </div>
      </div>

      {aiResponse.clarifyingQuestions.length > 0 && (
        <div className={`rounded-2xl p-4 border space-y-3 ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🤔</span>
            <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Уточнюючі питання (опційно)
            </h4>
          </div>

          {aiResponse.clarifyingQuestions.map((question, index) => (
            <div key={index} className="space-y-2">
              <p className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                {question}
              </p>
              <input
                type="text"
                value={selectedAnswers[index] || ''}
                onChange={(e) => handleClarifyingAnswer(index, e.target.value)}
                placeholder="Твоя відповідь..."
                disabled={isProcessing}
                className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-white/20' 
                    : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-slate-300'
                }`}
              />
            </div>
          ))}

          <button
            onClick={() => onSubmitWithClarifications(selectedAnswers)}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ 
              background: `linear-gradient(135deg, ${themeColor} 0%, #6366f1 100%)`,
              color: 'white'
            }}
          >
            {isProcessing ? 'Уточнюємо...' : 'Додати з уточненнями'}
          </button>
        </div>
      )}

      <button
        onClick={handleSubmitWithEdits}
        disabled={isProcessing}
        className="w-full py-5 rounded-2xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
        style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: 'none'
        }}
      >
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl">✅</span>
          <span className="text-base font-bold text-white">
            {isProcessing ? 'Додаємо...' : 'Додати в холодильник'}
          </span>
        </div>
      </button>
    </div>
  );
};