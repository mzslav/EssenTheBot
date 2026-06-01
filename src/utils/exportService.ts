import supabase from '../supabase/supabase-client';

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

async function getInternalUserId(telegramUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', telegramUserId)
    .single();
  if (error || !data) throw new Error('Користувача не знайдено');
  return data.id as number;
}

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
  lines.push(`[Звіт] EssenTheBot — ${period}`);
  lines.push('═══════════════════════');

  if (meals.length > 0) {
    const totalCal = meals.reduce((s, m) => s + m.calories, 0);
    const avgCal = Math.round(totalCal / meals.length);
    const totalProt = Math.round(meals.reduce((s, m) => s + m.protein, 0));
    const totalFat = Math.round(meals.reduce((s, m) => s + m.fat, 0));
    const totalCarbs = Math.round(meals.reduce((s, m) => s + m.carbs, 0));
    const uniqueDays = new Set(meals.map(m => m.date)).size;

    lines.push('');
    lines.push(`🥗 Харчування (${meals.length} записів, ${uniqueDays} днів)`);
    lines.push(`  Середні калорії: ${avgCal} ккал/день`);
    lines.push(`  Загальні Б/Ж/В: ${totalProt}г / ${totalFat}г / ${totalCarbs}г`);

    const mealCounts: Record<string, number> = {};
    meals.forEach(m => { mealCounts[m.name] = (mealCounts[m.name] || 0) + 1; });
    const top3 = Object.entries(mealCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (top3.length > 0) {
      lines.push('  Топ страви:');
      top3.forEach(([name, count]) => {
        lines.push(`    • ${name} (×${count})`);
      });
    }
  }

  if (workouts.length > 0) {
    const completed = workouts.filter(w => w.status === 'completed');
    lines.push('');
    lines.push(`💪 Тренування (${completed.length} завершених)`);
    const workoutNames: Record<string, number> = {};
    completed.forEach(w => { workoutNames[w.name] = (workoutNames[w.name] || 0) + 1; });
    Object.entries(workoutNames).forEach(([name, count]) => {
      lines.push(`  • ${name}: ${count} раз(ів)`);
    });
  }

  if (weights.length >= 2) {
    const latest = weights[0];
    const earliest = weights[weights.length - 1];
    const diff = +(latest.weight - earliest.weight).toFixed(1);
    lines.push('');
    lines.push('[Вага]');
    lines.push(`  Поточна: ${latest.weight} кг`);
    lines.push(`  Зміна: ${diff > 0 ? '+' : ''}${diff} кг`);
  }

  lines.push('');
  lines.push('───────────────────────');
  lines.push('🤖 Згенеровано EssenTheBot');

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
  const header = 'Дата,Страва,Калорії,Білки,Жири,Вуглеводи';
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
