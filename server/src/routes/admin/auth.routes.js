import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { authLimiter } from '../../middleware/rate-limit.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { loginSchema, changePasswordSchema, updateProfileSchema } from '../../validators/admin/auth.validator.js'
import {
  login,
  logout,
  me,
  changePassword,
  getSessionsInfo,
  revokeMyOtherSessions,
  updateProfile,
} from '../../controllers/admin/auth.controller.js'

const router = Router()

// Login is the only public admin route — brute-force limited.
router.post('/login', authLimiter, validate(loginSchema), login)

// Everything below requires a valid server-side session.
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)
router.put('/profile', requireAuth, validate(updateProfileSchema), updateProfile)
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword)
router.get('/sessions', requireAuth, getSessionsInfo)
router.post('/revoke-other-sessions', requireAuth, revokeMyOtherSessions)

export default router
