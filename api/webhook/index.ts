import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  const receivedSecret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Missing TELEGRAM_WEBHOOK_SECRET' });
  }

  if (receivedSecret !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
          en: `✨ Hi, <b>${firstName}</b>!\n\n🍏 <i>Essen</i> is your smart companion for tracking nutrition and fitness.\n\n🚀 <b>Ready to build better habits?</b>\nJust open the app below to get started! 👇`,
          uk: `✨ Привіт, <b>${firstName}</b>!\n\n🍏 <i>Essen</i> — твій розумний помічник для трекінгу харчування та фітнесу.\n\n🚀 <b>Готовий будувати кращі звички?</b>\nПросто відкрий додаток нижче, щоб розпочати! 👇`,
          pl: `✨ Cześć, <b>${firstName}</b>!\n\n🍏 <i>Essen</i> to Twój inteligentny asystent do śledzenia odżywiania i kondycji.\n\n🚀 <b>Gotowy na lepsze nawyki?</b>\nPo prostu otwórz aplikację poniżej, aby zacząć! 👇`,
          ru: `✨ Привет, <b>${firstName}</b>!\n\n🍏 <i>Essen</i> — твой умный помощник для трекинга питания и фитнеса.\n\n🚀 <b>Готов строить лучшие привычки?</b>\nПросто открой приложение ниже, чтобы начать! 👇`,
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
          en: `🤖 <i>Oops!</i> I only understand the <b>/start</b> command right now.\n\n📱 Open the app below to access all features!`,
          uk: `🤖 <i>Ой!</i> Поки що я розумію лише команду <b>/start</b>.\n\n📱 Відкрий додаток нижче, щоб скористатися всіма функціями!`,
          pl: `🤖 <i>Ups!</i> Na razie rozumiem tylko komendę <b>/start</b>.\n\n📱 Otwórz aplikację poniżej, aby uzyskać dostęp do wszystkich funkcji!`,
          ru: `🤖 <i>Ой!</i> Пока что я понимаю только команду <b>/start</b>.\n\n📱 Открой приложение ниже, чтобы воспользоваться всеми функциями!`,
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
