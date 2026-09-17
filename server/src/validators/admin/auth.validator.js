import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب').max(100),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(200),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(200),
  newPassword: z
    .string()
    .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .max(200, 'كلمة المرور طويلة جداً'),
})