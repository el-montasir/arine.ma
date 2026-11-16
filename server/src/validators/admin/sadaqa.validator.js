import { z } from 'zod'

// All amounts are integer centimes (1 DH = 100). Bounds are sanity limits.
const MAX_CENTS = 100_000_000 // 1 000 000 DH

const optionalText = (max, message) =>
  z
    .string()
    .max(max, message)
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null))

export const saveOrderProfitSchema = z
  .object({
    mode: z.enum(['AUTO', 'MANUAL'], { message: 'طريقة الحساب غير صحيحة' }),
    manualProfitCents: z
      .number()
      .int('الربح يجب أن يكون بالسنتيم')
      .min(-MAX_CENTS, 'الربح غير صحيح')
      .max(MAX_CENTS, 'الربح كبير جداً')
      .nullable()
      .optional(),
    goodsCostOverrideCents: z
      .number()
      .int('ثمن الشراء يجب أن يكون بالسنتيم')
      .min(0, 'ثمن الشراء لا يمكن أن يكون سالباً')
      .max(MAX_CENTS, 'ثمن الشراء كبير جداً')
      .nullable()
      .optional(),
    charges: z
      .array(
        z.object({
          type: z.enum(['SHIPPING_EXTRA', 'PACKAGING', 'OTHER'], { message: 'نوع المصروف غير صحيح' }),
          amountCents: z
            .number()
            .int('المبلغ يجب أن يكون بالسنتيم')
            .positive('مبلغ المصروف يجب أن يكون أكبر من 0')
            .max(MAX_CENTS, 'مبلغ المصروف كبير جداً'),
          note: optionalText(200, 'ملاحظة المصروف طويلة جداً'),
        })
      )
      .max(20, 'عدد المصاريف كبير جداً')
      .default([]),
    deliveredAt: z.string().datetime({ offset: true, message: 'تاريخ التسليم غير صحيح' }).nullable().optional(),
    note: optionalText(500, 'السبب طويل جداً'),
  })
  .superRefine((val, ctx) => {
    if (val.mode === 'MANUAL' && val.manualProfitCents == null) {
      ctx.addIssue({ code: 'custom', path: ['manualProfitCents'], message: 'أدخل الربح الحقيقي' })
    }
    if (val.mode === 'MANUAL' && !val.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'أدخل سبب تعديل الربح يدوياً' })
    }
  })

export const createSadaqaPaymentSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'الشهر غير صحيح'),
  amountCents: z
    .number()
    .int('المبلغ يجب أن يكون بالسنتيم')
    .positive('المبلغ يجب أن يكون أكبر من 0')
    .max(MAX_CENTS, 'المبلغ كبير جداً'),
  paidAt: z.string().datetime({ offset: true, message: 'تاريخ الإخراج غير صحيح' }),
  reference: optionalText(100, 'المرجع طويل جداً'),
  note: optionalText(1000, 'الملاحظة طويلة جداً'),
})

export const voidSadaqaPaymentSchema = z.object({
  reason: z.string().trim().min(3, 'أدخل سبب الإلغاء').max(500, 'السبب طويل جداً'),
})

export const setSadaqaRateSchema = z.object({
  rateBp: z
    .number()
    .int('النسبة غير صحيحة')
    .min(0, 'النسبة لا يمكن أن تكون سالبة')
    .max(10_000, 'النسبة لا يمكن أن تتجاوز 100٪'),
})
