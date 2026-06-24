import { deleteKnowledgeDocument } from '../adapters/knowledge-store';
import { createSupabaseServiceClient } from '../adapters/supabase';
import { ingestChunkedTextDocument } from './ingest-text-document';
import { ingestUserProfile } from './ingest-user-profile';

type UserProfile = Parameters<typeof ingestUserProfile>[0]['profile'];

type SyncUserKnowledgeInput = {
  userId: number;
  profile: UserProfile;
  referer?: string;
};

type DailyLog = {
  id: number;
  date: string;
  water_ml: number | null;
  tdee_at_time: number | null;
  protein_target: number | null;
  fat_target: number | null;
  carbs_target: number | null;
  meals: Array<{
    name: string;
    calories: number;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
  }> | null;
};

type WeightLog = {
  date: string;
  weight: number;
  note: string | null;
};

type WorkoutPlan = {
  id: number;
  name: string;
  muscle_group: string | null;
  plan_exercises: Array<{
    name: string;
    sets: number | null;
    reps: string | null;
    weight: number | null;
    rir: string | null;
    notes: string | null;
    order_index: number | null;
  }> | null;
};

type WorkoutSession = {
  id: number;
  date: string;
  name: string;
  notes: string | null;
  session_exercises: Array<{
    name: string;
    notes: string | null;
    order_index: number | null;
    session_sets: Array<{
      set_number: number;
      reps: number | null;
      weight: number | null;
      rir: number | null;
      is_completed: boolean;
    }> | null;
  }> | null;
};

type SnapshotChunk = {
  content: string;
  metadata?: Record<string, unknown>;
};

function getStartDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date.toISOString().slice(0, 10);
}

function buildNutritionChunks(logs: DailyLog[]): SnapshotChunk[] {
  return logs.map((log) => {
    const lines = [
      `Nutrition and hydration on ${log.date}: water ${log.water_ml ?? 0} ml; targets: ` +
        `${log.tdee_at_time ?? 'unknown'} kcal, ${log.protein_target ?? 'unknown'} g protein, ` +
        `${log.fat_target ?? 'unknown'} g fat, ${log.carbs_target ?? 'unknown'} g carbohydrates.`,
    ];

    if (log.meals?.length) {
      for (const meal of log.meals) {
        lines.push(
          `Meal: ${meal.name}; ${meal.calories} kcal; ${meal.protein ?? 0} g protein; ` +
            `${meal.fat ?? 0} g fat; ${meal.carbs ?? 0} g carbohydrates.`
        );
      }
    } else {
      lines.push('No meals recorded.');
    }

    return { content: lines.join('\n'), metadata: { date: log.date, dailyLogId: log.id } };
  });
}

function buildWeightChunks(logs: WeightLog[]): SnapshotChunk[] {
  const groupSize = 7;
  const chunks: SnapshotChunk[] = [];

  for (let index = 0; index < logs.length; index += groupSize) {
    const group = logs.slice(index, index + groupSize);
    chunks.push({
      content: [
        'Weight history:',
        ...group.map((log) => `- ${log.date}: ${log.weight} kg${log.note ? `; note: ${log.note}` : ''}.`),
      ].join('\n'),
      metadata: { fromDate: group.at(-1)?.date, toDate: group[0]?.date },
    });
  }

  return chunks;
}

function buildWorkoutPlanChunks(plans: WorkoutPlan[]): SnapshotChunk[] {
  return plans.map((plan) => {
    const exercises = [...(plan.plan_exercises ?? [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
    const lines = [
      `Current workout plan: ${plan.name}${plan.muscle_group ? `; muscle group: ${plan.muscle_group}` : ''}.`,
      ...exercises.map(
        (exercise) =>
          `- ${exercise.name}: ${exercise.sets ?? 'unknown'} sets, ${exercise.reps ?? 'unknown'} reps, ` +
          `${exercise.weight ?? 'unknown'} kg, RIR ${exercise.rir ?? 'unknown'}` +
          `${exercise.notes ? `; notes: ${exercise.notes}` : ''}.`
      ),
    ];

    return { content: lines.join('\n'), metadata: { workoutPlanId: plan.id } };
  });
}

function buildWorkoutHistoryChunks(sessions: WorkoutSession[]): SnapshotChunk[] {
  return sessions.map((session) => {
    const exercises = [...(session.session_exercises ?? [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
    const lines = [
      `Completed workout on ${session.date}: ${session.name}${session.notes ? `; notes: ${session.notes}` : ''}.`,
    ];

    for (const exercise of exercises) {
      const sets = (exercise.session_sets ?? [])
        .filter((set) => set.is_completed)
        .sort((a, b) => a.set_number - b.set_number);
      const setSummary = sets.length
        ? sets
            .map(
              (set) =>
                `set ${set.set_number}: ${set.reps ?? 'unknown'} reps at ${set.weight ?? 'unknown'} kg` +
                `${set.rir !== null ? `, RIR ${set.rir}` : ''}`
            )
            .join('; ')
        : 'no completed sets recorded';
      lines.push(`- ${exercise.name}: ${setSummary}${exercise.notes ? `; notes: ${exercise.notes}` : ''}.`);
    }

    return { content: lines.join('\n'), metadata: { workoutSessionId: session.id, date: session.date } };
  });
}

async function replaceOrDeleteSnapshot(input: {
  userId: number;
  title: string;
  chunks: SnapshotChunk[];
  sourceType: string;
  sourceRef: string;
  historyDays?: number;
  referer?: string;
}) {
  if (!input.chunks.length) {
    await deleteKnowledgeDocument({
      userId: input.userId,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
    });
    return null;
  }

  return ingestChunkedTextDocument({
    userId: input.userId,
    title: input.title,
    content: input.chunks.map((chunk) => chunk.content).join('\n\n'),
    chunks: input.chunks,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    metadata: {
      source: input.sourceType,
      ...(input.historyDays ? { historyDays: input.historyDays } : {}),
      syncedAt: new Date().toISOString(),
    },
    referer: input.referer,
  });
}

export async function syncUserKnowledge(input: SyncUserKnowledgeInput) {
  const supabase = createSupabaseServiceClient();
  const startDate = getStartDate(30);

  const [dailyLogsResult, weightLogsResult, workoutPlansResult, workoutSessionsResult] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('id,date,water_ml,tdee_at_time,protein_target,fat_target,carbs_target,meals(name,calories,protein,fat,carbs)')
      .eq('user_id', input.userId)
      .gte('date', startDate)
      .order('date', { ascending: false }),
    supabase
      .from('weight_logs')
      .select('date,weight,note')
      .eq('user_id', input.userId)
      .gte('date', startDate)
      .order('date', { ascending: false }),
    supabase
      .from('workout_plans')
      .select('id,name,muscle_group,plan_exercises(name,sets,reps,weight,rir,notes,order_index)')
      .eq('user_id', input.userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('workout_sessions')
      .select('id,date,name,notes,session_exercises(name,notes,order_index,session_sets(set_number,reps,weight,rir,is_completed))')
      .eq('user_id', input.userId)
      .eq('status', 'completed')
      .gte('date', startDate)
      .order('date', { ascending: false }),
  ]);

  const queryErrors = [
    ['nutrition history', dailyLogsResult.error],
    ['weight history', weightLogsResult.error],
    ['workout plans', workoutPlansResult.error],
    ['workout history', workoutSessionsResult.error],
  ] as const;
  const failedQuery = queryErrors.find(([, error]) => error);
  if (failedQuery) {
    throw new Error(`Failed to load ${failedQuery[0]}: ${failedQuery[1]?.message}`);
  }

  const [profile, nutrition, weight, workoutPlans, workoutHistory] = await Promise.all([
    ingestUserProfile({ userId: input.userId, profile: input.profile, referer: input.referer }),
    replaceOrDeleteSnapshot({
      userId: input.userId,
      title: 'Nutrition history',
      chunks: buildNutritionChunks((dailyLogsResult.data ?? []) as DailyLog[]),
      sourceType: 'nutrition_history',
      sourceRef: `nutrition-history:${input.userId}`,
      historyDays: 30,
      referer: input.referer,
    }),
    replaceOrDeleteSnapshot({
      userId: input.userId,
      title: 'Weight history',
      chunks: buildWeightChunks((weightLogsResult.data ?? []) as WeightLog[]),
      sourceType: 'weight_history',
      sourceRef: `weight-history:${input.userId}`,
      historyDays: 30,
      referer: input.referer,
    }),
    replaceOrDeleteSnapshot({
      userId: input.userId,
      title: 'Workout plans',
      chunks: buildWorkoutPlanChunks((workoutPlansResult.data ?? []) as WorkoutPlan[]),
      sourceType: 'workout_plans',
      sourceRef: `workout-plans:${input.userId}`,
      referer: input.referer,
    }),
    replaceOrDeleteSnapshot({
      userId: input.userId,
      title: 'Workout history',
      chunks: buildWorkoutHistoryChunks((workoutSessionsResult.data ?? []) as WorkoutSession[]),
      sourceType: 'workout_history',
      sourceRef: `workout-history:${input.userId}`,
      historyDays: 30,
      referer: input.referer,
    }),
  ]);

  return {
    syncedFrom: startDate,
    documents: { profile, nutrition, weight, workoutPlans, workoutHistory },
  };
}
