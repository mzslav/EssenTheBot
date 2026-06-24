import crypto from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS || 86400);

export class ApiError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function createSupabaseServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase server environment variables.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getInternalUserByTelegramId(telegramUserId: number) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      gender,
      age,
      weight,
      height,
      goal,
      activity,
      streak_days,
      "TDEE_Normal",
      "TDEE",
      "protein_Normal",
      protein,
      "fat_Normal",
      fat,
      "carbs_Normal",
      carbs,
      "waterPerDay",
      "BMI",
      "BMICategory",
      language
    `)
    .eq('telegram_user_id', telegramUserId)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'User not found.');
  }

  return data;
}

function buildTelegramSecret(botToken: string) {
  return crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
}

export function validateTelegramInitData(initData: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new ApiError(500, 'Missing TELEGRAM_BOT_TOKEN for Telegram initData validation.');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new ApiError(401, 'Telegram initData is missing hash.');
  }

  const pairs: string[] = [];

  for (const [key, value] of params.entries()) {
    if (key === 'hash') {
      continue;
    }

    pairs.push(`${key}=${value}`);
  }

  pairs.sort();

  const dataCheckString = pairs.join('\n');
  const computedHash = crypto
    .createHmac('sha256', buildTelegramSecret(TELEGRAM_BOT_TOKEN))
    .update(dataCheckString)
    .digest('hex');

  const computedHashBuffer = Buffer.from(computedHash, 'hex');
  const receivedHashBuffer = Buffer.from(hash, 'hex');

  if (
    computedHashBuffer.length !== receivedHashBuffer.length ||
    !crypto.timingSafeEqual(computedHashBuffer, receivedHashBuffer)
  ) {
    throw new ApiError(401, 'Invalid Telegram initData.');
  }

  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(authDate) ||
    authDate <= 0 ||
    now - authDate > TELEGRAM_INIT_DATA_MAX_AGE_SECONDS ||
    authDate > now + 60
  ) {
    throw new ApiError(401, 'Telegram initData has expired.');
  }

  const userRaw = params.get('user');

  if (!userRaw) {
    throw new ApiError(401, 'Telegram initData is missing user.');
  }

  const user = JSON.parse(userRaw) as { id?: number };

  if (!user.id) {
    throw new ApiError(401, 'Telegram initData does not contain a valid user id.');
  }

  return user.id;
}

export function resolveTelegramUserId(
  body: Record<string, unknown>,
  headers: Record<string, string | string[] | undefined>
) {
  const headerValue = headers['x-telegram-init-data'];
  const headerInitData = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const bodyInitData = typeof body.telegramInitData === 'string' ? body.telegramInitData : undefined;
  const initData = bodyInitData || headerInitData;

  if (initData) {
    return validateTelegramInitData(initData);
  }

  const isLocalDevelopment =
    process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';

  if (!isLocalDevelopment) {
    throw new ApiError(401, 'Telegram initData is required.');
  }

  const fallbackTelegramUserId = Number(body.telegramUserId);

  if (!Number.isFinite(fallbackTelegramUserId) || fallbackTelegramUserId <= 0) {
    throw new ApiError(400, 'Invalid telegramUserId');
  }

  return fallbackTelegramUserId;
}

export function getRequestReferer(headers: Record<string, string | string[] | undefined>) {
  const refererHeader = headers.referer;
  return Array.isArray(refererHeader) ? refererHeader[0] : refererHeader;
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
}

export function handleCorsPreflight(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

export function requireJsonPostRequest(req: VercelRequest) {
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed');
  }

  const headerValue = req.headers['content-type'];
  const contentType = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(415, 'Content-Type must be application/json.');
  }
}

export function assertMaxTextLength(label: string, value: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new ApiError(413, `${label} is too large.`);
  }
}

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

export async function consumeRateLimit(input: {
  key: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .rpc('consume_api_rate_limit', {
      p_key: input.key,
      p_limit: input.maxRequests,
      p_window_seconds: input.windowSeconds,
    })
    .single<RateLimitResult>();

  if (error || !data) {
    throw new ApiError(500, `Failed to enforce rate limit: ${error?.message ?? 'No data returned'}`);
  }

  if (!data.allowed) {
    throw new ApiError(429, 'Too many requests. Please try again soon.', {
      remaining: data.remaining,
      resetAt: data.reset_at,
    });
  }

  return data;
}

export async function authenticateTelegramRequest(
  req: VercelRequest,
  options?: {
    rateLimitKey?: string;
    maxRequests?: number;
    windowSeconds?: number;
  }
) {
  requireJsonPostRequest(req);

  const telegramUserId = resolveTelegramUserId(req.body ?? {}, req.headers);
  const user = await getInternalUserByTelegramId(telegramUserId);
  let rateLimit: RateLimitResult | null = null;

  if (options?.rateLimitKey && options.maxRequests && options.windowSeconds) {
    rateLimit = await consumeRateLimit({
      key: `${options.rateLimitKey}:${user.id}`,
      maxRequests: options.maxRequests,
      windowSeconds: options.windowSeconds,
    });
  }

  return {
    telegramUserId,
    user,
    referer: getRequestReferer(req.headers),
    rateLimit,
  };
}

export function sendApiError(res: VercelResponse, error: unknown) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message, ...(error.details ?? {}) });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return res.status(500).json({ error: message });
}
