import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import authRoutes from './auth.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import orderRoutes from './orders.routes.js'
import productRoutes from './products.routes.js'
import categoryRoutes from './categories.routes.js'
import profitRoutes from './profit.routes.js'
import customerRoutes from './customers.routes.js'
import settingRoutes from './settings.routes.js'

const router = Router()

// Auth sub-router handles its own requireAuth per-route so that
// POST /auth/login stays public. Every other admin section is force-gated here:
// the session is verified AND the admin row (role, isActive) is re-read from
// the database on each request — the frontend's route guards are cosmetic.
router.use('/auth', authRoutes)
router.use(requireAuth)

router.use('/dashboard', dashboardRoutes)
router.use('/orders', orderRoutes)
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/profit', profitRoutes)
router.use('/customers', customerRoutes)
router.use('/settings', settingRoutes)

export default router