import { z } from 'zod'

export const AVAILABILITY = ['in-stock', 'out-of-stock', 'pre-order']

const productFields = {
  title: z.string().trim().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  author: z.string().trim().min(1, 'المؤلف مطلوب').max(200, 'اسم المؤلف طويل جداً'),
  categoryId: z.number().int().positive('التصنيف غير صحيح'),
  price: z.number().int().min(0, 'السعر غير صحيح').max(1_000_000, 'السعر كبير جداً'),
  costPrice: z
    .number()
    .int()
    .min(0, 'سعر الشراء غير صحيح')
    .max(1_000_000, 'سعر الشراء كبير جداً')
    .nullable()
    .optional(),
  oldPrice: z.number().int().min(0).max(1_000_000).nullable().optional(),
  discount: z.number().int().min(0).max(100).optional(),
  image: z.string().trim().max(500, 'رابط الصورة طويل جداً').nullable().optional(),
  availability: z.enum(AVAILABILITY).default('in-stock'),
  description: z.string().max(5000, 'الوصف طويل جداً').nullable().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isNew: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  pages: z.number().int().positive().nullable().optional(),
  publisher: z.string().trim().max(200).nullable().optional(),
  year: z.string().trim().max(10).nullable().optional(),
}

export const createProductSchema = z.object(productFields)

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'لا توجد بيانات للتعديل' })