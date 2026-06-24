import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ragEnv } from './_lib/env.js';
import { syncUserKnowledge } from './_lib/modules/sync-user-knowledge.js';
import { applyCors, authenticateTelegramRequest, handleCorsPreflight, sendApiError } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCors(req, res);

  try {
    const { user, referer, rateLimit } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'rag-sync',
      maxRequests: ragEnv.syncRateLimitMaxRequests(),
      windowSeconds: ragEnv.syncRateLimitWindowSeconds(),
    });
    const result = await syncUserKnowledge({
      userId: user.id,
      profile: {
        gender: user.gender,
        age: user.age,
        weight: user.weight,
        height: user.height,
        goal: user.goal,
        activity: user.activity,
        streakDays: user.streak_days,
        tdeeNormal: user.TDEE_Normal,
        tdee: user.TDEE,
        proteinNormal: user.protein_Normal,
        protein: user.protein,
        fatNormal: user.fat_Normal,
        fat: user.fat,
        carbsNormal: user.carbs_Normal,
        carbs: user.carbs,
        waterPerDay: user.waterPerDay,
        bmi: user.BMI,
        bmiCategory: user.BMICategory,
        language: user.language,
      },
      referer,
    });

    return res.status(200).json({
      ok: true,
      syncedAt: new Date().toISOString(),
      rateLimitRemaining: rateLimit?.remaining ?? null,
      rateLimitResetAt: rateLimit?.reset_at ?? null,
      ...result,
    });
  } catch (error) {
    return sendApiError(res, error);
  }
}
