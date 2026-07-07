import supabase from '../supabase/supabase-client';

export interface FavoriteMeal {
  id: number;
  user_id: number;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  emoji: string;
  use_count: number;
  created_at: string;
}

import { getInternalUserId, getEmojiForName } from './supabaseService';

export async function addFavorite(
  telegramUserId: number,
  meal: { name: string; calories: number; protein: number; fat: number; carbs: number; emoji?: string }
): Promise<FavoriteMeal> {
  const internalId = await getInternalUserId(telegramUserId);

  const { data: existing } = await supabase
    .from('favorite_meals')
    .select('id')
    .eq('user_id', internalId)
    .eq('name', meal.name)
    .maybeSingle();

  if (existing) {
    throw new Error('already_in_favorites');
  }

  const emoji = meal.emoji || getEmojiForName(meal.name);

  const { data, error } = await supabase
    .from('favorite_meals')
    .insert({
      user_id: internalId,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      emoji,
      use_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`error: ${error.message}`);
  return data;
}

export async function removeFavorite(favoriteId: number): Promise<void> {
  const { error } = await supabase
    .from('favorite_meals')
    .delete()
    .eq('id', favoriteId);
  if (error) throw new Error(`error_deleting: ${error.message}`);
}

export async function getFavorites(
  telegramUserId: number
): Promise<FavoriteMeal[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('favorite_meals')
    .select('*')
    .eq('user_id', internalId)
    .order('use_count', { ascending: false });

  if (error) throw new Error(`error: ${error.message}`);
  return data || [];
}

export async function incrementFavoriteUseCount(favoriteId: number): Promise<void> {
  const { data } = await supabase
    .from('favorite_meals')
    .select('use_count')
    .eq('id', favoriteId)
    .single();

  if (data) {
    await supabase
      .from('favorite_meals')
      .update({ use_count: (data.use_count || 0) + 1 })
      .eq('id', favoriteId);
  }
}

export async function isFavorite(
  telegramUserId: number,
  mealName: string
): Promise<boolean> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data } = await supabase
    .from('favorite_meals')
    .select('id')
    .eq('user_id', internalId)
    .eq('name', mealName)
    .maybeSingle();
  return !!data;
}

