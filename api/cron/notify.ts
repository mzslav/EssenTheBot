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
    const supabaseResp = await fetch(`${SUPABASE_URL}/rest/v1/users?or=(notify_water.eq.true,notify_meals.eq.true)&select=telegram_user_id,first_name,notify_meals,notify_water,waterPerDay,language`, {
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

    const translations: any = {
      uk: {
        water: (name: string, water: string) => `💧 Не забудь випити воду, ${name}!\n\nТвоя ціль: ${water}л на день.`,
        meal_13: (name: string) => `🍽️ Час записати обід, ${name}!\n\nВідкрий додаток та додай страву.`,
        meal_19: (name: string) => `🍽️ Час записати вечерю, ${name}!\n\nВідкрий додаток та додай страву.`
      },
      en: {
        water: (name: string, water: string) => `💧 Don't forget to drink water, ${name}!\n\nYour goal: ${water}L per day.`,
        meal_13: (name: string) => `🍽️ Time to log your lunch, ${name}!\n\nOpen the app and add your meal.`,
        meal_19: (name: string) => `🍽️ Time to log your dinner, ${name}!\n\nOpen the app and add your meal.`
      },
      pl: {
        water: (name: string, water: string) => `💧 Nie zapomnij wypić wody, ${name}!\n\nTwój cel: ${water}L dziennie.`,
        meal_13: (name: string) => `🍽️ Czas zapisać obiad, ${name}!\n\nOtwórz aplikację i dodaj posiłek.`,
        meal_19: (name: string) => `🍽️ Czas zapisać kolację, ${name}!\n\nOtwórz aplikację i dodaj posiłek.`
      },
      ru: {
        water: (name: string, water: string) => `💧 Не забудь выпить воду, ${name}!\n\nТвоя цель: ${water}л в день.`,
        meal_13: (name: string) => `🍽️ Время записать обед, ${name}!\n\nОткрой приложение и добавь блюдо.`,
        meal_19: (name: string) => `🍽️ Время записать ужин, ${name}!\n\nОткрой приложение и добавь блюдо.`
      }
    };

    for (const user of users) {
      const hour = parseInt(
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false })
      );

      for (const user of users) {
        const lang = user.language || 'uk';
        const t = translations[lang] || translations['uk'];

        if (hour === 10) {
          if (user.notify_water) {
            const waterVal = ((user.waterPerDay || 2500) / 1000).toFixed(1);
            await sendTelegramMessage(BOT_TOKEN, user.telegram_user_id, t.water(user.first_name, waterVal));
            sent++;
          }
        }

        if (hour === 19) {
          if (user.notify_water) {
            const waterVal = ((user.waterPerDay || 2500) / 1000).toFixed(1);
            await sendTelegramMessage(BOT_TOKEN, user.telegram_user_id, t.water(user.first_name, waterVal));
            sent++;
          }
          if (user.notify_meals) {
            await sendTelegramMessage(BOT_TOKEN, user.telegram_user_id, t.meal_19(user.first_name));
            sent++;
          }
        }
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
