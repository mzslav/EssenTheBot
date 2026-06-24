import type { AIResponse } from '../types/types';
import i18n from '../i18n';
import { buildApiUrl } from './apiUrl';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

function getTelegramInitData() {
  return ((window.Telegram?.WebApp as { initData?: string } | undefined)?.initData) || '';
}

function getTelegramUserId() {
  const user = (window.Telegram?.WebApp as { initDataUnsafe?: { user?: { id?: number } } } | undefined)?.initDataUnsafe?.user;
  return user?.id;
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

  return `You are a fitness bot nutritionist that helps users track food and calories. Your task is to: 1) Analyze what the user ate, 2) Determine the name of the dish in ${targetLang}, 3) Calculate calories and macronutrients (protein, fat, carbohydrates), 4) Generate 2-3 clarifying questions for a more accurate calculation in ${targetLang}. CRITICALLY IMPORTANT: Reply ONLY with valid JSON without markdown formatting, without explanations, without additional text. Response format: {"name": "Dish name in ${targetLang}", "calories": 450, "protein": 35, "fat": 12, "carbs": 48, "clarifyingQuestions": ["Question 1?", "Question 2?"]}. If the information is insufficient, make educated guesses for a standard portion.`;
}

async function callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  const response = await fetch(buildApiUrl('/api/ai/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegramInitData: getTelegramInitData(),
      telegramUserId: getTelegramUserId(),
      messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`api_error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === 'content_filter') {
      throw new Error('content_filtered');
    } else if (finishReason === 'length') {
      throw new Error('response_too_long');
    }
    throw new Error('empty_response');
  }

  return content;
}

function parseAIResponse(aiText: string): AIResponse {
  if (!aiText || aiText.trim() === '') {
    throw new Error('empty_response');
  }

  let cleanText = aiText.trim();
  cleanText = cleanText.replace(/^```json\s*/g, '').replace(/^```\s*/g, '');
  cleanText = cleanText.replace(/\s*```$/g, '');
  cleanText = cleanText.trim();

  const parsed = JSON.parse(cleanText);

  if (!parsed.name || typeof parsed.calories !== 'number') {
    throw new Error('invalid_format');
  }

  return {
    name: parsed.name || 'Unknown meal',
    calories: parseInt(parsed.calories) || 0,
    protein: parseInt(parsed.protein) || 0,
    fat: parseInt(parsed.fat) || 0,
    carbs: parseInt(parsed.carbs) || 0,
    clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions : [],
  };
}

export async function analyzeTextInput(text: string): Promise<AIResponse> {
  const messages: OpenRouterMessage[] = [
    { role: 'user', content: `The user described what they ate: ${text}. Analyze this food and return the result in JSON format.` },
  ];
  const aiResponse = await callOpenRouter(messages);
  return parseAIResponse(aiResponse);
}

export async function analyzePhotoInput(photoBase64: string, description?: string): Promise<AIResponse> {
  const userPrompt = description
    ? `The user sent a photo of their food with the description: ${description}. Analyze the photo and description, return the result in JSON format.`
    : `The user sent a photo of their food. Analyze what is in the photo and return the result in JSON format.`;

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
    clarificationText = '\n\nAnswers to clarifying questions:\n';
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
          text: `Previously you recognized this photo as "${originalResponse.name}" with the following metrics:
- Calories: ${originalResponse.calories}
- Protein: ${originalResponse.protein}g
- Fat: ${originalResponse.fat}g
- Carbs: ${originalResponse.carbs}g

Description: "${originalInput}"
${clarificationText}

RECALCULATE more accurately taking into account the answers. JSON format.`,
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `Previously you recognized "${originalInput}" as "${originalResponse.name}" with the following metrics:
- Calories: ${originalResponse.calories}
- Protein: ${originalResponse.protein}g
- Fat: ${originalResponse.fat}g
- Carbs: ${originalResponse.carbs}g
${clarificationText}

RECALCULATE more accurately. JSON format WITHOUT clarifying questions (clarifyingQuestions = []).`,
    });
  }

  const aiResponse = await callOpenRouter(messages);
  const parsed = parseAIResponse(aiResponse);
  return { ...parsed, clarifyingQuestions: [] };
}
