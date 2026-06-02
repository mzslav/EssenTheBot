import type { Question } from './types/types';

export const questions: Question[] = [
  {
    fieldLabel: "Стать",
    labelKey: "form.fields.gender.label",
    fieldType: "radio",
    requiredField: true,
    fieldOptions: {
      values: [
        { option: "Чоловік", optionKey: "form.fields.gender.options.male" },
        { option: "Жінка", optionKey: "form.fields.gender.options.female" }
      ]
    },
    key: 'gender'
  },
  {
    fieldLabel: "Скільки тобі років?",
    labelKey: "form.fields.age.label",
    fieldType: "number",
    placeholder: "Наприклад: 28",
    placeholderKey: "form.fields.age.placeholder",
    requiredField: true,
    key: 'age'
  },
  {
    fieldLabel: "Твоя вага зараз",
    labelKey: "form.fields.weight.label",
    fieldType: "number",
    placeholder: "У кілограмах (наприклад: 78.5)",
    placeholderKey: "form.fields.weight.placeholder",
    requiredField: true,
    key: 'weight'
  },
  {
    fieldLabel: "Твій зріст",
    labelKey: "form.fields.height.label",
    fieldType: "number",
    placeholder: "У сантиметрах (наприклад: 175)",
    placeholderKey: "form.fields.height.placeholder",
    requiredField: true,
    key: 'height'
  },
  {
    fieldLabel: "Яка твоя мета?",
    labelKey: "form.fields.goal.label",
    fieldType: "radio",
    requiredField: true,
    fieldOptions: {
      values: [
        { option: "Схуднути (-300–500 ккал)", optionKey: "form.fields.goal.options.lose" },
        { option: "Набрати м'язи (+300–500 ккал)", optionKey: "form.fields.goal.options.gain" },
        { option: "Підтримувати форму (±100 ккал)", optionKey: "form.fields.goal.options.maintain" }
      ]
    },
    key: 'goal'
  },
  {
    fieldLabel: "Рівень активності",
    labelKey: "form.fields.activity.label",
    fieldType: "radio",
    requiredField: true,
    fieldOptions: {
      values: [
        { option: "Сидячий (офіс, мало руху)", optionKey: "form.fields.activity.options.sedentary" },
        { option: "Легка активність (1–3 трен/тиждень)", optionKey: "form.fields.activity.options.light" },
        { option: "Середня (3–5 тренувань)", optionKey: "form.fields.activity.options.moderate" },
        { option: "Висока (6–7 тренувань)", optionKey: "form.fields.activity.options.high" }
      ]
    },
    key: 'activity'
  }
];