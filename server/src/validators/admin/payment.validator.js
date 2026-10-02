import { z } from 'zod'

export const createPaymentSchema = z.object({
  purchaseId: z.number().int().positive('معرف طلب الشراء غير صحيح'),
  supplierId: z.number().int().positive('معرف المورد غير صحيح').optional(),
  amount: z.number().positive('مبلغ الدفعة يجب أن يكون أكبر من 0').max(10_000_000, 'مبلغ الدفعة كبير جداً'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).optional().default('CASH'),
  reference: z
    .string()
    .trim()
    .max(100, 'الرقم المرجعي طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  paymentDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  note: z
    .string()
    .max(1000, 'الملاحظات طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
})
