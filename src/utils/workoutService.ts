import supabase from '../supabase/supabase-client';
import { getInternalUserId } from './supabaseService';
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
  ExerciseLibraryItem,
  SessionExercise,
} from '../types/types';

type SessionExerciseStatus = NonNullable<SessionExercise['status']>;

const DEFAULT_SESSION_SETS = 3;

function trimOrUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeExerciseForm(formData: ExerciseFormData | Partial<ExerciseFormData>) {
  return {
    exercise_id: formData.exercise_id,
    name: trimOrUndefined(formData.name) ?? '',
    video_url: trimOrUndefined(formData.video_url),
    sets: Number(formData.sets) || DEFAULT_SESSION_SETS,
    reps: trimOrUndefined(formData.reps) ?? '8-10',
    weight: Number(formData.weight) || 0,
    rir: trimOrUndefined(formData.rir) ?? '1-2',
    notes: trimOrUndefined(formData.notes),
  };
}

async function getPlanOwnerId(planId: number): Promise<number> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('user_id')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data.user_id as number;
}

async function getSessionOwnerId(sessionId: number): Promise<number> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data.user_id as number;
}

async function getExerciseByNameForUser(userId: number, name: string): Promise<ExerciseLibraryItem | null> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getOrCreateExerciseForUser(
  userId: number,
  formData: ExerciseFormData | Partial<ExerciseFormData>
): Promise<ExerciseLibraryItem> {
  const normalized = normalizeExerciseForm(formData);
  if (!normalized.name) throw new Error('exercise_name_required');

  if (normalized.exercise_id) {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('id', normalized.exercise_id)
      .single();

    if (error) throw error;
    return data;
  }

  const existing = await getExerciseByNameForUser(userId, normalized.name);
  if (existing) {
    const updates: Partial<ExerciseLibraryItem> = {};
    if (!existing.video_url && normalized.video_url) updates.video_url = normalized.video_url;
    if (!existing.notes && normalized.notes) updates.notes = normalized.notes;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('exercise_library')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return existing;
  }

  const { data, error } = await supabase
    .from('exercise_library')
    .insert({
      user_id: userId,
      name: normalized.name,
      video_url: normalized.video_url,
      notes: normalized.notes,
    })
    .select()
    .single();

  if (error) {
    const racedExisting = await getExerciseByNameForUser(userId, normalized.name);
    if (racedExisting) return racedExisting;
    throw error;
  }

  return data;
}

async function touchExercise(exerciseId?: number | null) {
  if (!exerciseId) return;
  const { error } = await supabase
    .from('exercise_library')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', exerciseId);

  if (error) throw error;
}

async function insertSessionSets(sessionExerciseId: number, totalSets: number, source?: Partial<ExerciseFormData>) {
  const setsToInsert = Array.from({ length: Math.max(Number(totalSets) || DEFAULT_SESSION_SETS, 1) }, (_, i) => ({
    session_exercise_id: sessionExerciseId,
    set_number: i + 1,
    reps: null,
    weight: Number(source?.weight) || null,
    rir: null,
    is_completed: false,
  }));

  const { error } = await supabase
    .from('session_sets')
    .insert(setsToInsert);

  if (error) throw error;
}

export async function getPlans(telegramUserId: number): Promise<WorkoutPlan[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', internalId)
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

export async function createPlan(telegramUserId: number, formData: PlanFormData): Promise<WorkoutPlan> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({ user_id: internalId, ...formData })
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

export async function duplicatePlan(planId: number, telegramUserId: number): Promise<WorkoutPlan> {
  const original = await getPlanWithExercises(planId);
  if (!original) throw new Error('Plan not found');

  const internalId = await getInternalUserId(telegramUserId);

  const { data: newPlan, error: planError } = await supabase
    .from('workout_plans')
    .insert({
      user_id: internalId,
      name: `${original.name} (копія)`,
      muscle_group: original.muscle_group,
    })
    .select()
    .single();

  if (planError) throw planError;

  if (original.exercises?.length > 0) {
    const exercisesToInsert = original.exercises.map((ex) => ({
      plan_id: newPlan.id,
      exercise_id: ex.exercise_id,
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
  const planOwnerId = await getPlanOwnerId(planId);
  const normalized = normalizeExerciseForm(formData);
  const libraryExercise = await getOrCreateExerciseForUser(planOwnerId, normalized);

  const { count } = await supabase
    .from('plan_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planId);

  const { data, error } = await supabase
    .from('plan_exercises')
    .insert({
      plan_id: planId,
      exercise_id: libraryExercise.id,
      name: normalized.name,
      video_url: normalized.video_url,
      sets: normalized.sets,
      reps: normalized.reps,
      weight: normalized.weight,
      rir: normalized.rir,
      notes: normalized.notes,
      order_index: count ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlanExercise(exerciseId: number, formData: Partial<ExerciseFormData>): Promise<void> {
  const { data: planExercise, error: planExerciseError } = await supabase
    .from('plan_exercises')
    .select('plan_id')
    .eq('id', exerciseId)
    .single();

  if (planExerciseError) throw planExerciseError;

  const planOwnerId = await getPlanOwnerId(planExercise.plan_id);
  const normalized = normalizeExerciseForm(formData);
  const libraryExercise = await getOrCreateExerciseForUser(planOwnerId, normalized);

  const { error } = await supabase
    .from('plan_exercises')
    .update({
      exercise_id: libraryExercise.id,
      name: normalized.name,
      video_url: normalized.video_url,
      sets: normalized.sets,
      reps: normalized.reps,
      weight: normalized.weight,
      rir: normalized.rir,
      notes: normalized.notes,
    })
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

export async function searchExerciseLibrary(
  telegramUserId: number,
  query = '',
  muscleGroup?: string
): Promise<ExerciseLibraryItem[]> {
  const internalId = await getInternalUserId(telegramUserId);
  let request = supabase
    .from('exercise_library')
    .select('*')
    .eq('user_id', internalId)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(30);

  const trimmed = query.trim();
  if (trimmed) request = request.ilike('name', `%${trimmed}%`);
  if (muscleGroup) request = request.eq('muscle_group', muscleGroup);

  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function getRecentExercises(telegramUserId: number, limit = 8): Promise<ExerciseLibraryItem[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .eq('user_id', internalId)
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getFavoriteExercises(telegramUserId: number): Promise<ExerciseLibraryItem[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .eq('user_id', internalId)
    .eq('is_favorite', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateExercise(
  telegramUserId: number,
  formData: ExerciseFormData | Partial<ExerciseFormData>
): Promise<ExerciseLibraryItem> {
  const internalId = await getInternalUserId(telegramUserId);
  return getOrCreateExerciseForUser(internalId, formData);
}

export async function getSessionByDate(telegramUserId: number, date: string): Promise<WorkoutSession | null> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', internalId)
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
  telegramUserId: number,
  planId: number,
  beforeDate: string
): Promise<SessionWithExercises | null> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      exercises:session_exercises(*)
    `)
    .eq('user_id', internalId)
    .eq('plan_id', planId)
    .eq('status', 'completed')
    .lte('date', beforeDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
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
  telegramUserId: number,
  planId: number,
  date: string
): Promise<WorkoutSession> {
  const plan = await getPlanWithExercises(planId);
  if (!plan) throw new Error('Plan not found');

  const internalId = await getInternalUserId(telegramUserId);
  const previousSession = await getPreviousSession(telegramUserId, planId, date);
  const previousSetsByExercise = new Map(
    (previousSession?.exercises ?? []).map((exercise) => [
      exercise.exercise_id ?? exercise.plan_exercise_id,
      new Map((exercise.sets ?? []).map((set) => [set.set_number, set])),
    ])
  );

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: internalId,
      plan_id: planId,
      date,
      name: plan.name,
      status: 'planned',
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  for (const ex of plan.exercises ?? []) {
    const libraryExercise = ex.exercise_id
      ? { id: ex.exercise_id }
      : await getOrCreateExerciseForUser(internalId, ex);

    const { data: sessionEx, error: exError } = await supabase
      .from('session_exercises')
      .insert({
        session_id: session.id,
        plan_exercise_id: ex.id,
        exercise_id: libraryExercise.id,
        name: ex.name,
        video_url: ex.video_url,
        notes: ex.notes,
        order_index: ex.order_index,
        status: 'planned' satisfies SessionExerciseStatus,
      })
      .select()
      .single();

    if (exError) throw exError;

    const previousExerciseSets = previousSetsByExercise.get(ex.exercise_id ?? ex.id);
    const setsToInsert = Array.from({ length: ex.sets }, (_, i) => {
      const setNumber = i + 1;
      const previousSet = previousExerciseSets?.get(setNumber);

      return {
        session_exercise_id: sessionEx.id,
        set_number: setNumber,
        reps: previousSet?.reps ?? null,
        weight: previousSet?.weight ?? ex.weight ?? null,
        rir: previousSet?.rir ?? null,
        is_completed: false,
      };
    });

    const { error: setsError } = await supabase
      .from('session_sets')
      .insert(setsToInsert);

    if (setsError) throw setsError;
  }

  return session;
}

export async function addExerciseToSession(
  telegramUserId: number,
  sessionId: number,
  formData: ExerciseFormData,
  orderIndex?: number
): Promise<SessionExercise> {
  const internalId = await getInternalUserId(telegramUserId);
  const sessionOwnerId = await getSessionOwnerId(sessionId);
  if (internalId !== sessionOwnerId) throw new Error('session_not_owned_by_user');

  const normalized = normalizeExerciseForm(formData);
  const libraryExercise = await getOrCreateExerciseForUser(internalId, normalized);

  const { count } = await supabase
    .from('session_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { data, error } = await supabase
    .from('session_exercises')
    .insert({
      session_id: sessionId,
      exercise_id: libraryExercise.id,
      name: normalized.name,
      video_url: normalized.video_url,
      notes: normalized.notes,
      order_index: orderIndex ?? count ?? 0,
      status: 'planned' satisfies SessionExerciseStatus,
    })
    .select()
    .single();

  if (error) throw error;

  await insertSessionSets(data.id, normalized.sets, normalized);
  await touchExercise(libraryExercise.id);
  return data;
}

export async function replaceSessionExercise(
  telegramUserId: number,
  sessionExerciseId: number,
  formData: ExerciseFormData
): Promise<SessionExercise> {
  const { data: current, error: currentError } = await supabase
    .from('session_exercises')
    .select('id, session_id, order_index')
    .eq('id', sessionExerciseId)
    .single();

  if (currentError) throw currentError;

  const replacement = await addExerciseToSession(
    telegramUserId,
    current.session_id,
    formData,
    Number(current.order_index) + 1
  );

  const { error } = await supabase
    .from('session_exercises')
    .update({
      status: 'replaced' satisfies SessionExerciseStatus,
      replaced_by_session_exercise_id: replacement.id,
    })
    .eq('id', sessionExerciseId);

  if (error) throw error;
  return replacement;
}

export async function skipSessionExercise(sessionExerciseId: number): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .update({ status: 'skipped' satisfies SessionExerciseStatus })
    .eq('id', sessionExerciseId);

  if (error) throw error;

  const { error: setsError } = await supabase
    .from('session_sets')
    .update({ is_completed: false })
    .eq('session_exercise_id', sessionExerciseId);

  if (setsError) throw setsError;
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
  data: { reps?: number | null; weight?: number | null; rir?: number | null; is_completed?: boolean }
): Promise<void> {
  const { data: updatedRows, error } = await supabase
    .from('session_sets')
    .update(data)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)
    .select('id');

  if (error) throw error;

  if (!updatedRows || updatedRows.length === 0) {
    const { error: insertError } = await supabase
      .from('session_sets')
      .insert({
        session_exercise_id: sessionExerciseId,
        set_number: setNumber,
        reps: data.reps ?? null,
        weight: data.weight ?? null,
        rir: data.rir ?? null,
        is_completed: data.is_completed ?? false,
      });

    if (insertError) throw insertError;
  }

  if (data.is_completed === true) {
    const { data: exercise, error: exerciseError } = await supabase
      .from('session_exercises')
      .select('exercise_id')
      .eq('id', sessionExerciseId)
      .single();

    if (exerciseError) throw exerciseError;

    const { error: statusError } = await supabase
      .from('session_exercises')
      .update({ status: 'completed' satisfies SessionExerciseStatus })
      .eq('id', sessionExerciseId);

    if (statusError) throw statusError;
    await touchExercise(exercise.exercise_id);
  }
}

export async function markSetCompleted(setId: number, is_completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('session_sets')
    .update({ is_completed })
    .eq('id', setId);

  if (error) throw error;
}

export async function getExerciseHistory(
  exerciseId: number
): Promise<ProgressEntry[]> {
  const { data, error } = await supabase
    .from('session_exercises')
    .select(`
      session_id,
      status,
      workout_sessions!inner(date),
      sets:session_sets(reps, weight, is_completed)
    `)
    .eq('exercise_id', exerciseId)
    .eq('workout_sessions.status', 'completed')
    .order('date', { referencedTable: 'workout_sessions', ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((entry: any) => !['skipped', 'replaced'].includes(entry.status))
    .map((entry: any) => {
      const sets = (entry.sets ?? []).filter((set: any) => set.is_completed);
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
    })
    .filter((entry) => entry.total_reps > 0 || entry.total_volume > 0 || entry.max_weight > 0);
}

export function calculateVolume(sets: SessionSet[]): number {
  return sets
    .filter(s => s.is_completed)
    .reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

export async function getSessionsByDate(telegramUserId: number, date: string): Promise<WorkoutSession[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', internalId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSessionStatusesByDateRange(
  telegramUserId: number,
  from: string,
  to: string
): Promise<Record<string, WorkoutSession['status'][]>> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('date,status')
    .eq('user_id', internalId)
    .gte('date', from)
    .lte('date', to);

  if (error) throw error;

  return (data ?? []).reduce<Record<string, WorkoutSession['status'][]>>((acc, session) => {
    const date = session.date as string;
    const status = session.status as WorkoutSession['status'];
    acc[date] = [...(acc[date] ?? []), status];
    return acc;
  }, {});
}
