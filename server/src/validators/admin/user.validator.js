import { z } from 'zod'
import { ALL_PERMISSIONS } from '../../constants/permissions.js'

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100),
    email: z.string().trim().email('البريد الإلكتروني غير صالح').max(150),
    username: z
      .string()
      .trim()
      .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
      .max(50)
      .optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .max(200, 'كلمة المرور طويلة جداً'),
    confirmPassword: z.string().optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
    permissions: z.array(z.string()).refine(
      (perms) => perms.every((p) => ALL_PERMISSIONS.includes(p)),
      { message: 'توجد صلاحيات غير صالحة' }
    ).default([]),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: 'كلمتا المرور غير متطابقتين',
      path: ['confirmPassword'],
    }
  )

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100).optional(),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').max(150).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  permissions: z
    .array(z.string())
    .refine((perms) => perms.every((p) => ALL_PERMISSIONS.includes(p)), {
      message: 'توجد صلاحيات غير صالحة',
    })
    .optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
})

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .max(200, 'كلمة المرور طويلة جداً'),
  revokeSessions: z.boolean().default(true),
})
