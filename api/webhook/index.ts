import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text.trim();
      const firstName = message.chat.first_name || 'User';
      const languageCode = message.from?.language_code || 'uk';

      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

      if (!BOT_TOKEN) {
        console.error('Missing TELEGRAM_BOT_TOKEN');
        return res.status(500).json({ error: 'Internal config error' });
      }

      if (text === '/start') {
        const translations: Record<string, string> = {
          en: `Hi, <b>${firstName}</b>!\n\nEssen is your smart companion for tracking nutrition and fitness.\nReady to build better habits? Just open the app below.`,
          uk: `Привіт, <b>${firstName}</b>!\n\nEssen — твій розумний помічник для трекінгу харчування та фітнесу.\nГотовий будувати кращі звички? Просто відкрий додаток нижче.`,
          pl: `Cześć, <b>${firstName}</b>!\n\nEssen to Twój inteligentny asystent do śledzenia odżywiania i kondycji.\nGotowy na lepsze nawyki? Po prostu otwórz aplikację poniżej.`,
          ru: `Привет, <b>${firstName}</b>!\n\nEssen — твой умный помощник для трекинга питания и фитнеса.\nГотов строить лучшие привычки? Просто открой приложение ниже.`,
        };

        const welcomeText = translations[languageCode] || translations['en'];

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'HTML',
          }),
        });
      } else {
        const fallbackTranslations: Record<string, string> = {
          en: `I only understand the /start command right now. Open the app to access all features!`,
          uk: `Поки що я розумію лише команду /start. Відкрий додаток, щоб скористатися всіма функціями!`,
          pl: `Na razie rozumiem tylko komendę /start. Otwórz aplikację, aby uzyskać dostęp do wszystkich funkcji!`,
          ru: `Пока что я понимаю только команду /start. Открой приложение, чтобы воспользоваться всеми функциями!`,
        };

        const fallbackText = fallbackTranslations[languageCode] || fallbackTranslations['en'];

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: fallbackText,
            parse_mode: 'HTML',
          }),
        });
      }
    }

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).send('OK');
  }
}