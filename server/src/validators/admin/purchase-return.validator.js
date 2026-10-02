import { z } from 'zod'

const returnItemSchema = z.object({
  productId: z.number().int().positive('معرف المنتج غير صحيح'),
  quantity: z.number().int().min(1, 'الكمية المرتجعة يجب أن تكون 1 على الأقل'),
  unitCost: z.number().min(0, 'سعر الوحدة غير صحيح').max(1_000_000, 'سعر الوحدة كبير جداً'),
  reason: z
    .string()
    .trim()
    .max(500, 'سبب الإرجاع طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
})

export const createPurchaseReturnSchema = z.object({
  supplierId: z.number().int().positive('معرف المورد غير صحيح'),
  purchaseId: z.number().int().positive('معرف طلب الشراء غير صحيح').nullable().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).optional().default('DRAFT'),
  returnDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  reason: z
    .string()
    .trim()
    .max(500, 'سبب الإرجاع طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  note: z
    .string()
    .max(1000, 'الملاحظات طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  items: z.array(returnItemSchema).min(1, 'يجب تحديد عنصر واحد على الأقل للإرجاع'),
})
