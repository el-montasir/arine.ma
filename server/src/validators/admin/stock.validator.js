import { z } from 'zod'

export const adjustStockSchema = z.object({
  newStock: z.number().int().min(0, 'الكمية لا يمكن أن تكون سالبة'),
  reason: z.enum(['MANUAL_ADJUSTMENT', 'RESTOCK'], { message: 'سبب التعديل غير صحيح' }),
  note: z.string().max(500).optional(),
})

export const updateStockSettingsSchema = z.object({
  stockManagementEnabled: z.boolean().optional(),
  allowOverselling: z.boolean().optional(),
  lowStockAlertEnabled: z.boolean().optional(),
  defaultLowStockThreshold: z.number().int().min(0).max(10000).optional(),
})
