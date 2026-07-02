import { createClient } from '@supabase/supabase-js';

import { loadLocalEnv, requireEnv } from './load-env.ts';

type UserRow = {
  id: number;
  gender: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  goal: string | null;
  activity: string | null;
  streak_days: number | null;
  TDEE_Normal: number | null;
  TDEE: number | null;
  protein_Normal: number | null;
  protein: number | null;
  fat_Normal: number | null;
  fat: number | null;
  carbs_Normal: number | null;
  carbs: number | null;
  waterPerDay: number | null;
  BMI: number | null;
  BMICategory: string | null;
  language: string | null;
};

function optional<T>(value: T | null) {
  return value ?? undefined;
}

loadLocalEnv();
requireEnv('OPENROUTER_API_KEY');
requireEnv('OPENROUTER_EMBEDDING_MODEL');

const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_KEY'), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { syncUserKnowledge } = await import('../api/rag/_lib/modules/sync-user-knowledge.ts');

const { data, error } = await supabase
  .from('users')
  .select(`
    id,
    gender,
    age,
    weight,
    height,
    goal,
    activity,
    streak_days,
    "TDEE_Normal",
    "TDEE",
    "protein_Normal",
    protein,
    "fat_Normal",
    fat,
    "carbs_Normal",
    carbs,
    "waterPerDay",
    "BMI",
    "BMICategory",
    language
  `)
  .order('id', { ascending: true });

if (error) {
  throw new Error(`Failed to load users for RAG reindex: ${error.message}`);
}

const users = (data ?? []) as UserRow[];
let synced = 0;
let failed = 0;

console.log(`Starting RAG reindex for ${users.length} users.`);

for (const user of users) {
  try {
    const result = await syncUserKnowledge({
      userId: user.id,
      profile: {
        gender: optional(user.gender),
        age: optional(user.age),
        weight: optional(user.weight),
        height: optional(user.height),
        goal: optional(user.goal),
        activity: optional(user.activity),
        streakDays: optional(user.streak_days),
        tdeeNormal: optional(user.TDEE_Normal),
        tdee: optional(user.TDEE),
        proteinNormal: optional(user.protein_Normal),
        protein: optional(user.protein),
        fatNormal: optional(user.fat_Normal),
        fat: optional(user.fat),
        carbsNormal: optional(user.carbs_Normal),
        carbs: optional(user.carbs),
        waterPerDay: optional(user.waterPerDay),
        bmi: optional(user.BMI),
        bmiCategory: optional(user.BMICategory),
        language: optional(user.language),
      },
    });
    synced += 1;
    console.log(`[${synced + failed}/${users.length}] Synced user ${user.id} from ${result.syncedFrom}.`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${synced + failed}/${users.length}] Failed user ${user.id}: ${message}`);
  }
}

console.log(`RAG reindex complete. Synced: ${synced}. Failed: ${failed}.`);

if (failed > 0) {
  process.exitCode = 1;
}
