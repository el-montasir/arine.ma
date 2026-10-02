import { z } from 'zod'

const purchaseItemSchema = z.object({
  productId: z.number().int().positive('معرف المنتج غير صحيح'),
  quantityOrdered: z.number().int().min(1, 'الكمية المطلوبة يجب أن تكون 1 على الأقل'),
  unitCost: z.number().min(0, 'سعر الوحدة غير صحيح').max(1_000_000, 'سعر الوحدة كبير جداً'),
  discount: z.number().min(0, 'الخصم غير صحيح').max(1_000_000, 'الخصم كبير جداً').optional().default(0),
})

export const createPurchaseSchema = z.object({
  supplierId: z.number().int().positive('معرف المورد غير صحيح'),
  status: z.enum(['DRAFT', 'ORDERED']).optional().default('DRAFT'),
  purchaseDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  expectedDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .nullable()
    .optional(),
  shippingCost: z.number().min(0, 'تكلفة الشحن غير صحيحة').optional().default(0),
  discount: z.number().min(0, 'الخصم غير صحيح').optional().default(0),
  otherCost: z.number().min(0, 'التكاليف الأخرى غير صحيحة').optional().default(0),
  notes: z
    .string()
    .max(2000, 'الملاحظات طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  items: z.array(purchaseItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل للمشتريات'),
})

export const updatePurchaseSchema = z.object({
  supplierId: z.number().int().positive('معرف المورد غير صحيح').optional(),
  purchaseDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  expectedDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .nullable()
    .optional(),
  shippingCost: z.number().min(0, 'تكلفة الشحن غير صحيحة').optional(),
  discount: z.number().min(0, 'الخصم غير صحيح').optional(),
  otherCost: z.number().min(0, 'التكاليف الأخرى غير صحيحة').optional(),
  notes: z
    .string()
    .max(2000, 'الملاحظات طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  items: z.array(purchaseItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل للمشتريات').optional(),
})

export const updatePurchaseStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ORDERED', 'CANCELLED'], {
    errorMap: () => ({ message: 'الحالة المحددة غير صحيحة' }),
  }),
})

const receiveItemSchema = z.object({
  purchaseItemId: z.number().int().positive('معرف عنصر الشراء غير صحيح').optional(),
  productId: z.number().int().positive('معرف المنتج غير صحيح'),
  quantityReceived: z.number().int().min(1, 'الكمية المستلمة يجب أن تكون 1 على الأقل'),
})

export const receivePurchaseItemsSchema = z.object({
  items: z.array(receiveItemSchema).min(1, 'يجب تحديد عنصر واحد على الأقل للاستلام'),
  note: z
    .string()
    .max(500, 'الملاحظة طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
})
