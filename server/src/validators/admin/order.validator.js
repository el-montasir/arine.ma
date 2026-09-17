import { z } from 'zod'

// Mirrors the Prisma OrderStatus enum — kept authoritatively server-side so
// the frontend can never send an invented status.
export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED']

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: 'الحالة غير صحيحة' }),
})