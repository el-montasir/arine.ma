import { z } from 'zod'

// Password complexity regex: at least 8 chars, must contain letters and numbers
const passwordComplexityRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'اسم المستخدم أو البريد الإلكتروني مطلوب').max(150),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(200),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(200),
    newPassword: z
      .string()
      .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
      .max(200, 'كلمة المرور طويلة جداً')
      .regex(
        passwordComplexityRegex,
        'كلمة المرور يجب أن تحتوي على أحرف وأرقام'
      ),
    confirmNewPassword: z.string().optional(),
    revokeOtherSessions: z.boolean().default(false),
  })
  .refine(
    (data) => !data.confirmNewPassword || data.newPassword === data.confirmNewPassword,
    {
      message: 'كلمتا المرور غير متطابقتين',
      path: ['confirmNewPassword'],
    }
  )

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل').max(50).optional(),
  email: z.string().email('البريد الإلكتروني غير صالح').max(150).optional(),
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة للتأكيد').max(200),
}).refine((data) => data.username || data.email, {
  message: 'يجب تقديم اسم المستخدم أو البريد الإلكتروني على الأقل',
})
