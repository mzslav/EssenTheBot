import supabase from '../supabase/supabase-client';

export { supabase };

export interface MealRecord {
  id: number;
  daily_log_id: number;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  created_at: string;
  emoji?: string;
  type?: 'text' | 'voice' | 'photo';
  _date?: string;
}

const FOOD_EMOJIS = [
  '🍗', '🥗', '🍳', '🍜', '🥩', '🍕', '🥪', '🍲', '🥘', '🍱',
  '🥙', '🌮', '🍝', '🥣', '🍛', '🥞', '🍔', '🍿', '🥧', '🧁',
];

export function getEmojiForName(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FOOD_EMOJIS[hash % FOOD_EMOJIS.length];
}

async function getInternalUserId(telegramUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', telegramUserId)
    .single();
  if (error || !data) throw new Error(`Користувача не знайдено (telegram_id: ${telegramUserId})`);
  return data.id as number;
}

export async function getOrCreateDayId(telegramUserId: number, date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const internalId = await getInternalUserId(telegramUserId);

  const { data, error } = await supabase.rpc('get_or_create_day_id', {
    p_user_id: internalId,
    p_date: targetDate,
  });

  if (error) throw new Error(`Помилка отримання дня: ${error.message}`);
  return data as number;
}

export async function saveMeal(
  telegramUserId: number,
  meal: { name: string; calories: number; protein: number; fat: number; carbs: number },
  inputMode: 'text' | 'voice' | 'photo' = 'text'
): Promise<MealRecord> {
  const dayId = await getOrCreateDayId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .insert({ daily_log_id: dayId, ...meal })
    .select()
    .single();
  if (error) throw new Error(`Помилка збереження їжі: ${error.message}`);
  return { ...data, emoji: getEmojiForName(data.name), type: inputMode };
}

export async function addMealToToday(
  telegramUserId: number,
  meal: Pick<MealRecord, 'name' | 'calories' | 'protein' | 'fat' | 'carbs'>,
  emoji?: string
): Promise<MealRecord> {
  const dayId = await getOrCreateDayId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .insert({
      daily_log_id: dayId,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
    })
    .select()
    .single();
  if (error) throw new Error(`Помилка додавання страви: ${error.message}`);
  return { ...data, emoji: emoji || getEmojiForName(data.name), type: 'text' as const };
}

export async function getRecentMeals(telegramUserId: number, limit = 5): Promise<MealRecord[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .select(`*, daily_logs!inner(user_id, date)`)
    .eq('daily_logs.user_id', internalId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Помилка завантаження записів: ${error.message}`);
  return (data || []).map((item: Record<string, any>) => ({
    id: item.id, daily_log_id: item.daily_log_id, name: item.name,
    calories: item.calories, protein: item.protein, fat: item.fat, carbs: item.carbs,
    created_at: item.created_at, _date: item.daily_logs?.date, emoji: getEmojiForName(item.name),
  }));
}

export async function getMealsByDate(telegramUserId: number, date: string): Promise<MealRecord[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .select(`*, daily_logs!inner(user_id, date)`)
    .eq('daily_logs.user_id', internalId)
    .eq('daily_logs.date', date)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Помилка завантаження записів за день: ${error.message}`);
  return (data || []).map((item: Record<string, any>) => ({
    id: item.id, daily_log_id: item.daily_log_id, name: item.name,
    calories: item.calories, protein: item.protein, fat: item.fat, carbs: item.carbs,
    created_at: item.created_at, _date: item.daily_logs?.date, emoji: getEmojiForName(item.name),
  }));
}

export async function getAllMeals(telegramUserId: number): Promise<MealRecord[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .select(`*, daily_logs!inner(user_id, date)`)
    .eq('daily_logs.user_id', internalId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Помилка завантаження всіх записів: ${error.message}`);
  return (data || []).map((item: Record<string, any>) => ({
    id: item.id, daily_log_id: item.daily_log_id, name: item.name,
    calories: item.calories, protein: item.protein, fat: item.fat, carbs: item.carbs,
    created_at: item.created_at, _date: item.daily_logs?.date, emoji: getEmojiForName(item.name),
  }));
}

export async function getTotalsByDate(
  telegramUserId: number, date: string
): Promise<{ calories: number; protein: number; fat: number; carbs: number }> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .select(`calories, protein, fat, carbs, daily_logs!inner(user_id, date)`)
    .eq('daily_logs.user_id', internalId)
    .eq('daily_logs.date', date);
  if (error) throw new Error(error.message);
  return (data || []).reduce(
    (acc: { calories: number; protein: number; fat: number; carbs: number }, item: Record<string, any>) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      fat: acc.fat + (item.fat || 0),
      carbs: acc.carbs + (item.carbs || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

export async function getTodayTotals(telegramUserId: number) {
  return getTotalsByDate(telegramUserId, new Date().toISOString().split('T')[0]);
}

export async function getWaterByDate(telegramUserId: number, date: string): Promise<number> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('daily_logs').select('water_ml')
    .eq('user_id', internalId).eq('date', date).maybeSingle();
  if (error) return 0;
  return data?.water_ml || 0;
}

export async function getTodayWater(telegramUserId: number): Promise<number> {
  return getWaterByDate(telegramUserId, new Date().toISOString().split('T')[0]);
}

export async function updateWaterByDate(
  telegramUserId: number, date: string, waterMl: number
): Promise<void> {
  const internalId = await getInternalUserId(telegramUserId);

  await getOrCreateDayId(telegramUserId, date);

  const { error } = await supabase
    .from('daily_logs')
    .update({ water_ml: waterMl })
    .eq('user_id', internalId)
    .eq('date', date);

  if (error) throw new Error(error.message);
}

export async function updateTodayWater(telegramUserId: number, waterMl: number): Promise<void> {
  return updateWaterByDate(telegramUserId, new Date().toISOString().split('T')[0], waterMl);
}

export async function deleteMeal(mealId: number): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', mealId);
  if (error) throw new Error(`Помилка видалення: ${error.message}`);
}