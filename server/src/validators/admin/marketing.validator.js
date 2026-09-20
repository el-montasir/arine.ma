import { z } from 'zod'

export const updateMarketingSettingsSchema = z.object({
  appId: z.string().trim().max(100).optional().nullable(),
  appSecret: z.string().trim().max(200).optional().nullable(),
  accessToken: z.string().trim().max(500).optional().nullable(),
  adAccountId: z.string().trim().max(100).optional().nullable(),
  pixelId: z.string().trim().max(100).optional().nullable(),
  capiToken: z.string().trim().max(500).optional().nullable(),
  testEventCode: z.string().trim().max(100).optional().nullable(),
  catalogId: z.string().trim().max(100).optional().nullable(),
  pixelEnabled: z.boolean().optional(),
  capiEnabled: z.boolean().optional(),
  autoCatalogSync: z.boolean().optional(),
  currency: z.string().trim().max(10).optional(),
  apiVersion: z.string().trim().max(20).optional(),
})

export const updateCampaignStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']),
})

export const sendTestEventSchema = z.object({
  eventName: z.enum(['PageView', 'ViewContent', 'Search', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Custom']),
  testEventCode: z.string().trim().max(100).optional().nullable(),
  customData: z.record(z.any()).optional(),
  userData: z.record(z.any()).optional(),
})

export const syncCatalogSchema = z.object({
  scope: z.enum(['ALL', 'BOOKS', 'PACKAGES']).optional().default('ALL'),
})
