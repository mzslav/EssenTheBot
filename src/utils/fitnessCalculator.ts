export function calculateFitnessMetrics({
  weight,
  height,
  age,
  gender,
  activityMultiplier,
  goalKey,
}: {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityMultiplier: number;
  goalKey: 'lose' | 'maintain' | 'gain';
}) {
  const isMale = gender.includes('Чоловік') || gender.includes('👨') || gender === 'male';
  let BMR = isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  BMR = Math.round(BMR);

  const TDEE_Normal = Math.round(BMR * activityMultiplier);
  let TDEE = TDEE_Normal;

  if (goalKey === 'gain') {
    TDEE = TDEE_Normal + 400;
  } else if (goalKey === 'lose') {
    const minSafe = isMale ? 1600 : 1300;
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

  if (goalKey === 'gain') {
    protein = Math.round(weight * 2.0);
    fat = Math.round(weight * 1.0);
  } else if (goalKey === 'lose') {
    protein = Math.round(weight * 2.1);
    fat = Math.round(weight * 0.9);
  }

  fat = Math.max(fat, Math.round((TDEE * 0.20) / 9));
  carbs = Math.max(20, Math.round((TDEE - (protein * 4 + fat * 9)) / 4));

  protein = Math.round(protein / 5) * 5;
  fat = Math.round(fat / 5) * 5;
  carbs = Math.round(carbs / 5) * 5;

  const waterPerDay = Math.min(Math.max(weight * 33, 2000), 4500);
  const BMI = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
  const BMICategory = BMI < 18.5 ? 'underweight' : BMI < 25 ? 'normal' : BMI < 30 ? 'overweight' : 'obesity';

  return {
    BMR,
    TDEE_Normal,
    TDEE,
    protein_Normal,
    fat_Normal,
    carbs_Normal,
    protein,
    fat,
    carbs,
    waterPerDay,
    BMI,
    BMICategory,
  };
}

export function getActivityMultiplier(activityStr: string): number {
  if (activityStr.includes('Сидячий') || activityStr.includes('sedentary')) return 1.2;
  if (activityStr.includes('Легка') || activityStr.includes('light')) return 1.375;
  if (activityStr.includes('Середня') || activityStr.includes('moderate')) return 1.55;
  if (activityStr.includes('Висока') || activityStr.includes('high')) return 1.725;
  return 1.2;
}

export function getGoalKey(goalStr: string): 'lose' | 'maintain' | 'gain' {
  if (goalStr.includes('Схуднути') || goalStr.includes('Схуднення') || goalStr.includes('lose')) return 'lose';
  if (goalStr.includes('Набрати') || goalStr.includes('Набір') || goalStr.includes('gain')) return 'gain';
  return 'maintain';
}
