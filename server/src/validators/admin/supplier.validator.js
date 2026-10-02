import { z } from 'zod'

const supplierFields = {
  name: z.string().trim().min(1, 'اسم المورد مطلوب').max(200, 'اسم المورد طويل جداً'),
  contactPerson: z
    .string()
    .trim()
    .max(200, 'اسم جهة الاتصال طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  phone: z
    .string()
    .trim()
    .max(50, 'رقم الهاتف طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  whatsapp: z
    .string()
    .trim()
    .max(50, 'رقم الواتساب طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  email: z
    .string()
    .trim()
    .email('البريد الإلكتروني غير صحيح')
    .max(200, 'البريد الإلكتروني طويل جداً')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  city: z
    .string()
    .trim()
    .max(100, 'اسم المدينة طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  address: z
    .string()
    .trim()
    .max(500, 'العنوان طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  notes: z
    .string()
    .max(2000, 'الملاحظات طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  isActive: z.boolean().optional().default(true),
}

export const createSupplierSchema = z.object(supplierFields)

export const updateSupplierSchema = z
  .object(supplierFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'لا توجد بيانات للتعديل' })

export const supplierProductSchema = z.object({
  productId: z.number().int().positive('معرف المنتج غير صحيح'),
  purchasePrice: z.number().min(0, 'سعر الشراء غير صحيح').max(1_000_000, 'سعر الشراء كبير جداً'),
  minimumOrderQuantity: z.number().int().min(1, 'الحد الأدنى للطلب يجب أن يكون 1 على الأقل').nullable().optional(),
  supplierSku: z
    .string()
    .trim()
    .max(100, 'رمز SKU للمورد طويل جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  notes: z
    .string()
    .max(1000, 'الملاحظات طويلة جداً')
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  isActive: z.boolean().optional().default(true),
})
