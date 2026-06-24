import { ingestTextDocument } from './ingest-text-document.js';

type UserProfileForKnowledge = {
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
  activity?: string;
  streakDays?: number;
  tdeeNormal?: number;
  tdee?: number;
  proteinNormal?: number;
  protein?: number;
  fatNormal?: number;
  fat?: number;
  carbsNormal?: number;
  carbs?: number;
  waterPerDay?: number;
  bmi?: number;
  bmiCategory?: string;
  language?: string;
};

type IngestUserProfileInput = {
  userId: number;
  profile: UserProfileForKnowledge;
  referer?: string;
};

function appendLine(lines: string[], label: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  lines.push(`- ${label}: ${value}`);
}

function buildUserProfileKnowledgeContent(profile: UserProfileForKnowledge) {
  const lines: string[] = ['User health and nutrition profile:'];

  appendLine(lines, 'Gender', profile.gender);
  appendLine(lines, 'Age', profile.age);
  appendLine(lines, 'Weight (kg)', profile.weight);
  appendLine(lines, 'Height (cm)', profile.height);
  appendLine(lines, 'Goal', profile.goal);
  appendLine(lines, 'Activity level', profile.activity);
  appendLine(lines, 'Current streak (days)', profile.streakDays);
  appendLine(lines, 'Normal TDEE estimate (kcal)', profile.tdeeNormal);
  appendLine(lines, 'Daily calorie target (kcal)', profile.tdee);
  appendLine(lines, 'Normal protein target (g)', profile.proteinNormal);
  appendLine(lines, 'Protein target (g)', profile.protein);
  appendLine(lines, 'Normal fat target (g)', profile.fatNormal);
  appendLine(lines, 'Fat target (g)', profile.fat);
  appendLine(lines, 'Normal carbohydrate target (g)', profile.carbsNormal);
  appendLine(lines, 'Carbohydrate target (g)', profile.carbs);
  appendLine(lines, 'Daily water target (ml)', profile.waterPerDay);
  appendLine(lines, 'BMI', profile.bmi);
  appendLine(lines, 'BMI category', profile.bmiCategory);
  appendLine(lines, 'Preferred language', profile.language);

  return lines.join('\n');
}

export async function ingestUserProfile(input: IngestUserProfileInput) {
  const content = buildUserProfileKnowledgeContent(input.profile);

  return ingestTextDocument({
    userId: input.userId,
    title: 'User profile summary',
    content,
    sourceType: 'profile',
    sourceRef: `user-profile:${input.userId}`,
    metadata: {
      profileVersion: 1,
      source: 'users-table',
      sanitized: true,
    },
    referer: input.referer,
  });
}
