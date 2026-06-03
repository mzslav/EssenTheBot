import type { AIResponse } from '../types/types';
import i18n from '../i18n';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite-preview-09-2025';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

function getSystemPrompt() {
  const lang = i18n.language || 'uk';
  const langNames: Record<string, string> = {
    'uk': 'українською мовою',
    'en': 'in English',
    'pl': 'w języku polskim',
    'ru': 'на русском языке'
  };
  const targetLang = langNames[lang] || 'українською мовою';

  return `Ти - фітнес бот-нутриціоніст, який допомагає користувачам відстежувати їжу та калорії. Твоє завдання: 1) Проаналізувати що з'їв користувач, 2) Визначити назву страви ${targetLang}, 3) Підрахувати калорії та макронутрієнти (білки, жири, вуглеводи), 4) Згенерувати 2-3 уточнюючі питання для точнішого підрахунку ${targetLang}. КРИТИЧНО ВАЖЛИВО: Відповідай ТІЛЬКИ валідним JSON без markdown форматування, без пояснень, без додаткового тексту. Формат відповіді: {"name": "Назва страви ${targetLang}", "calories": 450, "protein": 35, "fat": 12, "carbs": 48, "clarifyingQuestions": ["Питання 1?", "Питання 2?"]}. Якщо інформація недостатня - роби обґрунтовані припущення для стандартної порції.`;
}
const USE_PROXY = !import.meta.env.DEV;
async function callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  let data: any;

  if (USE_PROXY) {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
        model: OPENROUTER_MODEL,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API помилка: ${response.status} — ${errorText}`);
    }
    data = await response.json();
  } else {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key не знайдено. Додайте VITE_OPENROUTER_API_KEY в .env файл');
    }

    const requestBody: Record<string, unknown> = {
      model: OPENROUTER_MODEL,
      messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
      temperature: 0.3,
      max_tokens: 1500,
    };

    const supportsJsonMode = OPENROUTER_MODEL.includes('gpt-4') || OPENROUTER_MODEL.includes('gpt-3.5');
    if (supportsJsonMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'EssenTheBot',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API помилка: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch { }
      throw new Error(errorMessage);
    }

    data = await response.json();
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === 'content_filter') {
      throw new Error('Контент заблоковано фільтром. Спробуйте інший опис.');
    } else if (finishReason === 'length') {
      throw new Error('Відповідь занадто довга. Спробуйте коротший запит.');
    }
    throw new Error('API повернув порожню відповідь. Спробуйте іншу модель.');
  }

  return content;
}

function parseAIResponse(aiText: string): AIResponse {
  if (!aiText || aiText.trim() === '') {
    throw new Error('Порожня відповідь від AI');
  }

  let cleanText = aiText.trim();
  cleanText = cleanText.replace(/^```json\s*/g, '').replace(/^```\s*/g, '');
  cleanText = cleanText.replace(/\s*```$/g, '');
  cleanText = cleanText.trim();

  const parsed = JSON.parse(cleanText);

  if (!parsed.name || typeof parsed.calories !== 'number') {
    throw new Error('AI повернув невірний формат даних');
  }

  return {
    name: parsed.name || 'Невідома страва',
    calories: parseInt(parsed.calories) || 0,
    protein: parseInt(parsed.protein) || 0,
    fat: parseInt(parsed.fat) || 0,
    carbs: parseInt(parsed.carbs) || 0,
    clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions : [],
  };
}

export async function analyzeTextInput(text: string): Promise<AIResponse> {
  const messages: OpenRouterMessage[] = [
    { role: 'user', content: `Користувач описав що з'їв: ${text}. Проаналізуй цю їжу та поверни результат у JSON форматі.` },
  ];
  const aiResponse = await callOpenRouter(messages);
  return parseAIResponse(aiResponse);
}

export async function analyzePhotoInput(photoBase64: string, description?: string): Promise<AIResponse> {
  const userPrompt = description
    ? `Користувач надіслав фото своєї їжі з описом: ${description}. Проаналізуй фото та опис, поверни результат у JSON форматі.`
    : `Користувач надіслав фото своєї їжі. Проаналізуй що на фото та поверни результат у JSON форматі.`;

  const messages: OpenRouterMessage[] = [
    { role: 'user', content: [{ type: 'image_url', image_url: { url: photoBase64 } }, { type: 'text', text: userPrompt }] },
  ];
  const aiResponse = await callOpenRouter(messages);
  return parseAIResponse(aiResponse);
}

export async function refineWithClarifications(
  originalResponse: AIResponse,
  inputMode: 'text' | 'photo',
  originalInput: string,
  photoBase64?: string,
  clarifications?: string[]
): Promise<AIResponse> {
  let clarificationText = '';
  if (clarifications?.length && originalResponse.clarifyingQuestions) {
    clarificationText = '\n\nВідповіді на уточнюючі питання:\n';
    originalResponse.clarifyingQuestions.forEach((question, index) => {
      if (clarifications[index]) {
        clarificationText += `- ${question}: ${clarifications[index]}\n`;
      }
    });
  }

  const messages: OpenRouterMessage[] = [];

  if (inputMode === 'photo' && photoBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: photoBase64 } },
        {
          type: 'text',
          text: `Раніше ти розпізнав це фото як "${originalResponse.name}" з показниками:
- Калорії: ${originalResponse.calories}
- Білки: ${originalResponse.protein}г
- Жири: ${originalResponse.fat}г
- Вуглеводи: ${originalResponse.carbs}г

Опис: "${originalInput}"
${clarificationText}

ПЕРЕРАХУЙ більш точно з урахуванням відповідей. JSON формат.`,
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `Раніше ти розпізнав "${originalInput}" як "${originalResponse.name}" з показниками:
- Калорії: ${originalResponse.calories}
- Білки: ${originalResponse.protein}г
- Жири: ${originalResponse.fat}г
- Вуглеводи: ${originalResponse.carbs}г
${clarificationText}

ПЕРЕРАХУЙ більш точно. JSON формат БЕЗ уточнюючих питань (clarifyingQuestions = []).`,
    });
  }

  const aiResponse = await callOpenRouter(messages);
  const parsed = parseAIResponse(aiResponse);
  return { ...parsed, clarifyingQuestions: [] };
}