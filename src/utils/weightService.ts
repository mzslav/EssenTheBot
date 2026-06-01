import supabase from '../supabase/supabase-client';

export interface WeightEntry {
  id: number;
  user_id: number;
  weight: number;
  date: string;
  note?: string;
  created_at: string;
}

async function getInternalUserId(telegramUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', telegramUserId)
    .single();
  if (error || !data) throw new Error('Користувача не знайдено');
  return data.id as number;
}

export async function addWeightEntry(
  telegramUserId: number,
  weight: number,
  date?: string,
  note?: string
): Promise<WeightEntry> {
  const internalId = await getInternalUserId(telegramUserId);
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weight_logs')
    .upsert(
      { user_id: internalId, weight, date: targetDate, note },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw new Error(`Помилка збереження ваги: ${error.message}`);

  await supabase
    .from('users')
    .update({ weight })
    .eq('id', internalId);

  return data;
}

export async function getWeightHistory(
  telegramUserId: number,
  limit = 90
): Promise<WeightEntry[]> {
  const internalId = await getInternalUserId(telegramUserId);

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', internalId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Помилка завантаження: ${error.message}`);
  return data || [];
}

export async function getLatestWeight(
  telegramUserId: number
): Promise<WeightEntry | null> {
  const internalId = await getInternalUserId(telegramUserId);

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', internalId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function deleteWeightEntry(entryId: number): Promise<void> {
  const { error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('id', entryId);
  if (error) throw new Error(`Помилка видалення: ${error.message}`);
}
