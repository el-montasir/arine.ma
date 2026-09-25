import { Router } from 'express'
import {
  listNotifications,
  getUnreadNotificationsCount,
  markAsRead,
  markAllAsRead,
} from '../../controllers/admin/notification.controller.js'

const router = Router()

// All notification operations are scoped to the authenticated admin
router.get('/', listNotifications)
router.get('/unread-count', getUnreadNotificationsCount)
router.patch('/read-all', markAllAsRead)
router.post('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)

export default router
