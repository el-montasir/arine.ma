import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import authRoutes from './auth.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import orderRoutes from './orders.routes.js'
import productRoutes from './products.routes.js'
import packageRoutes from './packages.routes.js'
import categoryRoutes from './categories.routes.js'
import profitRoutes from './profit.routes.js'
import customerRoutes from './customers.routes.js'
import settingRoutes from './settings.routes.js'
import shippingRoutes from './shipping.routes.js'
import bannerRoutes from './banners.routes.js'
import storeConfigRoutes from './store-config.routes.js'
import uploadRoutes from './uploads.routes.js'
import usersRoutes from './users.routes.js'
import activityLogRoutes from './activity-log.routes.js'

const router = Router()

// Auth sub-router handles its own requireAuth per-route so that
// POST /auth/login stays public. Every other admin section is force-gated here:
// the session is verified AND the admin row (role, isActive, status, permissions)
// is re-read from the database on each request — the frontend's route guards are cosmetic.
router.use('/auth', authRoutes)
router.use(requireAuth)

router.use('/dashboard', dashboardRoutes)
router.use('/orders', orderRoutes)
router.use('/products', productRoutes)
router.use('/packages', packageRoutes)
router.use('/categories', categoryRoutes)
router.use('/profit', profitRoutes)
router.use('/customers', customerRoutes)
router.use('/settings', settingRoutes)
router.use('/shipping', shippingRoutes)
router.use('/banners', bannerRoutes)
router.use('/store-config', storeConfigRoutes)
router.use('/uploads', uploadRoutes)
router.use('/users', usersRoutes)
router.use('/admin-users', usersRoutes)
router.use('/activity-logs', activityLogRoutes)
router.use('/activity-log', activityLogRoutes)

export default router
