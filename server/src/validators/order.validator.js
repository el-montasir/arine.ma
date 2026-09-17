import { z } from 'zod'

// Payment method — only Cash-on-Delivery for now; adding more later means
// extending this enum (and the Prisma PaymentMethod enum).
export const PAYMENT_METHODS = ['CASH_ON_DELIVERY'] // exported for future use

export const createOrderSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'الاسم الكامل مطلوب')
    .max(100, 'الاسم طويل جداً'),
  phone: z
    .string()
    .trim()
    .min(8, 'رقم الهاتف غير صحيح')
    .max(20, 'رقم الهاتف غير صحيح')
    .regex(/^[+0-9\s()-]+$/, 'رقم الهاتف غير صحيح'),
  city: z
    .string()
    .trim()
    .min(1, 'المدينة مطلوبة')
    .max(80, 'المدينة طويلة جداً'),
  address: z
    .string()
    .trim()
    .min(5, 'العنوان مطلوب')
    .max(300, 'العنوان طويل جداً'),
  note: z.string().trim().max(500, 'الملاحظة طويلة جداً').optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('معرف الكتاب غير صحيح'),
        quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر').max(99, 'الكمية كبيرة جداً'),
      })
    )
    .min(1, 'يجب إرسال كتاب واحد على الأقل')
    .max(50, 'عدد كبير جداً من العناصر'),
})

export const getOrderParamsSchema = z.object({
  orderNumber: z.string().trim().regex(/^AR-\d{8}-\d{4}$/),
})