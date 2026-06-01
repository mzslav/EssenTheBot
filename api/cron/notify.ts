import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const supabaseResp = await fetch(`${SUPABASE_URL}/rest/v1/users?notify_water=eq.true&select=telegram_user_id,first_name,notify_meals,waterPerDay`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!supabaseResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const users = await supabaseResp.json();
    let sent = 0;

    for (const user of users) {
      const hour = new Date().getHours();

      if (user.notify_water && hour >= 9 && hour <= 21 && hour % 3 === 0) {
        await sendTelegramMessage(
          BOT_TOKEN,
          user.telegram_user_id,
          `💧 Не забудь випити воду, ${user.first_name}!\n\nТвоя ціль: ${((user.waterPerDay || 2500) / 1000).toFixed(1)}л на день.`
        );
        sent++;
      }

      if (user.notify_meals && (hour === 13 || hour === 19)) {
        const mealType = hour === 13 ? 'обід' : 'вечерю';
        await sendTelegramMessage(
          BOT_TOKEN,
          user.telegram_user_id,
          `🍽️ Час записати ${mealType}, ${user.first_name}!\n\nВідкрий додаток та додай страву.`
        );
        sent++;
      }
    }

    return res.status(200).json({ success: true, sent });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}
