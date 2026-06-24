import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ingestUserProfile } from './lib/modules/ingest-user-profile';
import { ragEnv } from './lib/env';
import { authenticateTelegramRequest, sendApiError } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { user, referer } = await authenticateTelegramRequest(req, {
      rateLimitKey: 'rag-ingest-profile',
      maxRequests: ragEnv.syncRateLimitMaxRequests(),
      windowSeconds: ragEnv.syncRateLimitWindowSeconds(),
    });

    const result = await ingestUserProfile({
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

    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return sendApiError(res, error);
  }
}
