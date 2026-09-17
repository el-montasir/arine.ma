import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'اسم التصنيف مطلوب').max(100, 'الاسم طويل جداً'),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'الرابط غير صحيح').optional(),
})

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'اسم التصنيف مطلوب').max(100, 'الاسم طويل جداً'),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'الرابط غير صحيح').optional(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'لا توجد بيانات للتعديل' })