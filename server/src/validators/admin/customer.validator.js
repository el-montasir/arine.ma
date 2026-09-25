import { z } from 'zod'

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1, 'اسم العميل مطلوب').max(150).optional(),
  phone: z.string().min(6, 'رقم الهاتف غير صحيح').max(30).optional(),
  city: z.string().max(100).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})

export const archiveCustomerSchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})
