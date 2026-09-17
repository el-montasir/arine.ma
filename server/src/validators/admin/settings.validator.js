import { z } from 'zod'

export const upsertSettingSchema = z.object({
  key: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, 'المفتاح غير صحيح'),
  value: z.string().max(5000, 'القيمة طويلة جداً'),
})