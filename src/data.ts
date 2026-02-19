import type { Question } from './types/types';

export const questions: Question[] = [
  {
    fieldLabel: "Стать",
    fieldType: "radio",
    requiredField: true,
    fieldOptions: {
      values: [
        { option: "Чоловік 👨" },
        { option: "Жінка 👩" }
      ]
    },
    key: 'gender'
  },
  {
    fieldLabel: "Скільки тобі років?",
    fieldType: "number",
    placeholder: "Наприклад: 28",
    requiredField: true,
    key: 'age'
  },
  {
    fieldLabel: "Твоя вага зараз",
    fieldType: "number",
    placeholder: "У кілограмах (наприклад: 78.5)",
    requiredField: true,
    key: 'weight'
  },
  {
    fieldLabel: "Твій зріст",
    fieldType: "number",
    placeholder: "У сантиметрах (наприклад: 175)",
    requiredField: true,
    key: 'height'
  },
  {
    fieldLabel: "Яка твоя мета?",
    fieldType: "radio",
    requiredField: true,
    fieldOptions: {
      values: [
        { option: "Схуднути (-300–500 ккал) 🔥" },
        { option: "Набрати м'язи (+300–500 ккал) 💪" },
        { option: "Підтримувати форму (±100 ккал)" }
      ]
    },
    key: 'goal'
  },
  {
    fieldLabel: "Рівень активності",
    fieldType: "dropdown",
    requiredField: true,
    fieldOptions: {
      values: [
        { option: "Сидячий (офіс, мало руху) 🪑" },
        { option: "Легка активність (1–3 трен/тиждень) 🚶" },
        { option: "Середня (3–5 тренувань) 🏃" },
        { option: "Висока (6–7 тренувань) 🔥" }
      ]
    },
    key: 'activity'
  }
];