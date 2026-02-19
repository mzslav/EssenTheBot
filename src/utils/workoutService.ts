import supabase from '../supabase/supabase-client';
import type {
  WorkoutPlan,
  WorkoutPlanWithExercises,
  PlanExercise,
  ExerciseFormData,
  PlanFormData,
  WorkoutSession,
  SessionWithExercises,
  SessionSet,
  ProgressEntry,
} from '../types/types';


export async function getPlans(userId: number): Promise<WorkoutPlan[]> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPlanWithExercises(planId: number): Promise<WorkoutPlanWithExercises | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`*, exercises:plan_exercises(*)`)
    .eq('id', planId)
    .order('order_index', { referencedTable: 'plan_exercises', ascending: true })
    .single();

  if (error) throw error;
  return data;
}

export async function createPlan(userId: number, formData: PlanFormData): Promise<WorkoutPlan> {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({ user_id: userId, ...formData })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlan(planId: number, formData: Partial<PlanFormData>): Promise<void> {
  const { error } = await supabase
    .from('workout_plans')
    .update(formData)
    .eq('id', planId);

  if (error) throw error;
}

export async function deletePlan(planId: number): Promise<void> {
  const { error } = await supabase
    .from('workout_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

export async function duplicatePlan(planId: number, userId: number): Promise<WorkoutPlan> {
  const original = await getPlanWithExercises(planId);
  if (!original) throw new Error('Plan not found');

  const { data: newPlan, error: planError } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      name: `${original.name} (копія)`,
      muscle_group: original.muscle_group,
    })
    .select()
    .single();

  if (planError) throw planError;

  if (original.exercises?.length > 0) {
    const exercisesToInsert = original.exercises.map((ex) => ({
      plan_id: newPlan.id,
      name: ex.name,
      video_url: ex.video_url,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      rir: ex.rir,
      notes: ex.notes,
      order_index: ex.order_index,
    }));

    const { error: exError } = await supabase
      .from('plan_exercises')
      .insert(exercisesToInsert);

    if (exError) throw exError;
  }

  return newPlan;
}


export async function getPlanExercises(planId: number): Promise<PlanExercise[]> {
  const { data, error } = await supabase
    .from('plan_exercises')
    .select('*')
    .eq('plan_id', planId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPlanExercise(planId: number, formData: ExerciseFormData): Promise<PlanExercise> {
  const { count } = await supabase
    .from('plan_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planId);

  const { data, error } = await supabase
    .from('plan_exercises')
    .insert({ plan_id: planId, ...formData, order_index: count ?? 0 })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlanExercise(exerciseId: number, formData: Partial<ExerciseFormData>): Promise<void> {
  const { error } = await supabase
    .from('plan_exercises')
    .update(formData)
    .eq('id', exerciseId);

  if (error) throw error;
}

export async function deletePlanExercise(exerciseId: number): Promise<void> {
  const { error } = await supabase
    .from('plan_exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) throw error;
}

export async function reorderPlanExercises(orderedIds: number[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from('plan_exercises').update({ order_index: index }).eq('id', id)
  );
  await Promise.all(updates);
}


export async function getSessionByDate(userId: number, date: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSessionWithExercises(sessionId: number): Promise<SessionWithExercises | null> {
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      exercises:session_exercises(*)
    `)
    .eq('id', sessionId)
    .order('order_index', { referencedTable: 'session_exercises', ascending: true })
    .single();

  if (sessionError) throw sessionError;
  if (!sessionData) return null;

  const exercisesWithSets = await Promise.all(
    (sessionData.exercises ?? []).map(async (ex: any) => {
      const { data: sets, error: setsError } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_exercise_id', ex.id)
        .order('set_number', { ascending: true });

      if (setsError) throw setsError;
      return { ...ex, sets: sets ?? [] };
    })
  );

  return { ...sessionData, exercises: exercisesWithSets } as SessionWithExercises;
}

export async function getPreviousSession(
  userId: number,
  planId: number,
  beforeDate: string
): Promise<SessionWithExercises | null> {
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      exercises:session_exercises(*)
    `)
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('status', 'completed')
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .order('order_index', { referencedTable: 'session_exercises', ascending: true })
    .limit(1)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!sessionData) return null;

  const exercisesWithSets = await Promise.all(
    (sessionData.exercises ?? []).map(async (ex: any) => {
      const { data: sets, error: setsError } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_exercise_id', ex.id)
        .order('set_number', { ascending: true });

      if (setsError) throw setsError;
      return { ...ex, sets: sets ?? [] };
    })
  );

  return { ...sessionData, exercises: exercisesWithSets } as SessionWithExercises;
}

export async function createSessionFromPlan(
  userId: number,
  planId: number,
  date: string
): Promise<WorkoutSession> {
  const plan = await getPlanWithExercises(planId);
  if (!plan) throw new Error('Plan not found');

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      plan_id: planId,
      date,
      name: plan.name,
      status: 'planned',
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  for (const ex of plan.exercises ?? []) {
    const { data: sessionEx, error: exError } = await supabase
      .from('session_exercises')
      .insert({
        session_id: session.id,
        plan_exercise_id: ex.id,
        name: ex.name,
        video_url: ex.video_url,
        notes: ex.notes,
        order_index: ex.order_index,
      })
      .select()
      .single();

    if (exError) throw exError;

    const setsToInsert = Array.from({ length: ex.sets }, (_, i) => ({
      session_exercise_id: sessionEx.id,
      set_number: i + 1,
      reps: null,
      weight: ex.weight,
      rir: null,
      is_completed: false,
    }));

    const { error: setsError } = await supabase
      .from('session_sets')
      .insert(setsToInsert);

    if (setsError) throw setsError;
  }

  return session;
}

export async function updateSessionStatus(
  sessionId: number,
  status: 'planned' | 'in_progress' | 'completed'
): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function upsertSet(
  sessionExerciseId: number,
  setNumber: number,
  data: { reps?: number; weight?: number; rir?: number; is_completed?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('session_sets')
    .upsert(
      { session_exercise_id: sessionExerciseId, set_number: setNumber, ...data },
      { onConflict: 'session_exercise_id,set_number' }
    );

  if (error) throw error;
}

export async function markSetCompleted(setId: number, is_completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('session_sets')
    .update({ is_completed })
    .eq('id', setId);

  if (error) throw error;
}

export async function getExerciseHistory(
  planExerciseId: number
): Promise<ProgressEntry[]> {
  const { data, error } = await supabase
    .from('session_exercises')
    .select(`
      session_id,
      workout_sessions!inner(date),
      sets:session_sets(reps, weight)
    `)
    .eq('plan_exercise_id', planExerciseId)
    .eq('workout_sessions.status', 'completed')
    .order('date', { referencedTable: 'workout_sessions', ascending: true });

  if (error) throw error;

  return (data ?? []).map((entry: any) => {
    const sets = entry.sets ?? [];
    const weights = sets.map((s: any) => s.weight ?? 0);
    const reps = sets.map((s: any) => s.reps ?? 0);
    const volume = sets.reduce((sum: number, s: any) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

    return {
      date: entry.workout_sessions.date,
      max_weight: Math.max(...weights, 0),
      total_volume: volume,
      total_reps: reps.reduce((a: number, b: number) => a + b, 0),
      session_id: entry.session_id,
    };
  });
}

export function calculateVolume(sets: SessionSet[]): number {
  return sets
    .filter(s => s.is_completed)
    .reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

export async function getSessionsByDate(userId: number, date: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}