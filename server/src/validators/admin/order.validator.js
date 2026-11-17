import { z } from 'zod'

// Mirrors the Prisma OrderStatus enum — kept authoritatively server-side so
// the frontend can never send an invented status.
export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURNED']

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: 'الحالة غير صحيحة' }),
})

export const ORDER_SOURCES = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'STORE', 'OTHER']
// A typed order can start anywhere in the normal flow, not as cancelled/returned.
export const MANUAL_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED']

const line = (idKey, idMessage) =>
  z.object({
    [idKey]: z.number().int().positive(idMessage),
    quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر').max(999, 'الكمية كبيرة جداً'),
    // Selling price for this order only; omitted = the catalog price.
    unitPrice: z.number().int('الثمن بالدرهم فقط').min(0, 'الثمن لا يمكن أن يكون سالباً').max(1_000_000, 'الثمن كبير جداً').nullable().optional(),
  })

export const createManualOrderSchema = z
  .object({
    fullName: z.string().trim().min(2, 'الاسم الكامل مطلوب').max(100, 'الاسم طويل جداً'),
    phone: z
      .string()
      .trim()
      .min(8, 'رقم الهاتف غير صحيح')
      .max(20, 'رقم الهاتف غير صحيح')
      .regex(/^[+0-9\s()-]+$/, 'رقم الهاتف غير صحيح'),
    // Optional for in-store sales.
    city: z.string().trim().max(80, 'المدينة طويلة جداً').optional().default(''),
    address: z.string().trim().max(300, 'العنوان طويل جداً').optional().default(''),
    note: z.string().trim().max(500, 'الملاحظة طويلة جداً').optional(),
    source: z.enum(ORDER_SOURCES, { message: 'مصدر الطلب غير صحيح' }),
    status: z.enum(MANUAL_ORDER_STATUSES, { message: 'الحالة غير صحيحة' }),
    // Omitted = computed like the storefront.
    shipping: z.number().int('التوصيل بالدرهم فقط').min(0, 'التوصيل لا يمكن أن يكون سالباً').max(10_000, 'التوصيل كبير جداً').nullable().optional(),
    items: z.array(line('productId', 'معرف الكتاب غير صحيح')).max(50, 'عدد كبير جداً من العناصر').default([]),
    packages: z.array(line('packageId', 'معرف الباقة غير صحيح')).max(20, 'عدد كبير جداً من الباقات').default([]),
    // Books/packages that are not in the store catalog, typed by the admin.
    customItems: z
      .array(
        z.object({
          title: z.string().trim().min(2, 'اسم الكتاب قصير جداً').max(200, 'اسم الكتاب طويل جداً'),
          quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر').max(999, 'الكمية كبيرة جداً'),
          unitPrice: z.number().int('الثمن بالدرهم فقط').min(0, 'الثمن لا يمكن أن يكون سالباً').max(1_000_000, 'الثمن كبير جداً'),
          // Optional: without it the order's profit stays "to complete".
          unitCostPrice: z.number().int('ثمن الشراء بالدرهم فقط').min(0, 'ثمن الشراء لا يمكن أن يكون سالباً').max(1_000_000, 'ثمن الشراء كبير جداً').nullable().optional(),
        })
      )
      .max(20, 'عدد كبير جداً من العناصر')
      .default([]),
  })
  .refine((v) => v.items.length + v.packages.length + v.customItems.length > 0, { message: 'أضف كتاباً أو باقة واحدة على الأقل' })
