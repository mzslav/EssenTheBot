import supabase from '../supabase/supabase-client';
import i18n from '../i18n';

interface ExportMeal {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  date: string;
}

interface ExportWorkout {
  name: string;
  date: string;
  status: string;
}

interface ExportWeightEntry {
  date: string;
  weight: number;
}

import { getInternalUserId } from './supabaseService';

export async function exportMealsForPeriod(
  telegramUserId: number,
  startDate: string,
  endDate: string
): Promise<ExportMeal[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('meals')
    .select('name, calories, protein, fat, carbs, created_at, daily_logs!inner(user_id, date)')
    .eq('daily_logs.user_id', internalId)
    .gte('daily_logs.date', startDate)
    .lte('daily_logs.date', endDate)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((m: any) => ({
    name: m.name,
    calories: m.calories,
    protein: m.protein,
    fat: m.fat,
    carbs: m.carbs,
    date: m.daily_logs?.date || '',
  }));
}

export async function exportWorkoutsForPeriod(
  telegramUserId: number,
  startDate: string,
  endDate: string
): Promise<ExportWorkout[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('name, date, status')
    .eq('user_id', telegramUserId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map((w: any) => ({
    name: w.name,
    date: w.date,
    status: w.status,
  }));
}

export async function exportWeightLogs(
  telegramUserId: number
): Promise<ExportWeightEntry[]> {
  const internalId = await getInternalUserId(telegramUserId);
  const { data, error } = await supabase
    .from('weight_logs')
    .select('date, weight')
    .eq('user_id', internalId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map((w: any) => ({
    date: w.date,
    weight: w.weight,
  }));
}

export function generateTextReport(
  meals: ExportMeal[],
  workouts: ExportWorkout[],
  weights: ExportWeightEntry[],
  period: string
): string {
  const lines: string[] = [];
  lines.push(`[${i18n.t('main.report')}] EssenTheBot — ${period}`);
  lines.push('═══════════════════════');

  if (meals.length > 0) {
    const totalCal = meals.reduce((s, m) => s + m.calories, 0);
    const avgCal = Math.round(totalCal / meals.length);
    const totalProt = Math.round(meals.reduce((s, m) => s + m.protein, 0));
    const totalFat = Math.round(meals.reduce((s, m) => s + m.fat, 0));
    const totalCarbs = Math.round(meals.reduce((s, m) => s + m.carbs, 0));
    const uniqueDays = new Set(meals.map(m => m.date)).size;

    lines.push('');
    lines.push(`🥗 ${i18n.t('stats.tabs.nutrition')} (${meals.length}, ${uniqueDays} ${i18n.t('stats.days_pct')})`);
    lines.push(`  ${i18n.t('stats.avg_calories')}: ${avgCal} ${i18n.t('stats.kcal')}/${i18n.t('main.today').toLowerCase()}`);
    lines.push(`  ${i18n.t('stats.macros_g')}: ${totalProt}г / ${totalFat}г / ${totalCarbs}г`);

    const mealCounts: Record<string, number> = {};
    meals.forEach(m => { mealCounts[m.name] = (mealCounts[m.name] || 0) + 1; });
    const top3 = Object.entries(mealCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (top3.length > 0) {
      lines.push(`  Топ:`);
      top3.forEach(([name, count]) => {
        lines.push(`    • ${name} (×${count})`);
      });
    }
  }

  if (workouts.length > 0) {
    const completed = workouts.filter(w => w.status === 'completed');
    lines.push('');
    lines.push(`💪 ${i18n.t('workout.title')} (${completed.length} ${i18n.t('workout.journal_tab.completed').toLowerCase()})`);
    const workoutNames: Record<string, number> = {};
    completed.forEach(w => { workoutNames[w.name] = (workoutNames[w.name] || 0) + 1; });
    Object.entries(workoutNames).forEach(([name, count]) => {
      lines.push(`  • ${name}: ${count}`);
    });
  }

  if (weights.length >= 2) {
    const latest = weights[0];
    const earliest = weights[weights.length - 1];
    const diff = +(latest.weight - earliest.weight).toFixed(1);
    lines.push('');
    lines.push(`[${i18n.t('weight_tracking.title')}]`);
    lines.push(`  ${i18n.t('weight_tracking.current')}: ${latest.weight} ${i18n.t('results.kg')}`);
    lines.push(`  ${i18n.t('weight_tracking.change')}: ${diff > 0 ? '+' : ''}${diff} ${i18n.t('results.kg')}`);
  }

  lines.push('');
  lines.push('───────────────────────');
  lines.push('🤖 EssenTheBot');

  return lines.join('\n');
}

export function shareToTelegram(text: string): void {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.switchInlineQuery) {
    tg.switchInlineQuery(text.substring(0, 256));
  } else {
    navigator.clipboard.writeText(text).catch(() => { });
  }
}

export function generateCSV(meals: ExportMeal[]): string {
  const header = `${i18n.t('history.today')},${i18n.t('barcode.default_product')},${i18n.t('barcode.kcal')},${i18n.t('barcode.protein')},${i18n.t('barcode.fat')},${i18n.t('barcode.carbs')}`;
  const rows = meals.map(m =>
    `${m.date},"${m.name.replace(/"/g, '""')}",${m.calories},${m.protein},${m.fat},${m.carbs}`
  );
  return [header, ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
