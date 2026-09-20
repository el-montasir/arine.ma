import { rateLimit } from 'express-rate-limit'

// Brute-force protection for the login endpoint.
// 10 attempts per 15 minutes per IP — plenty for a human, nothing for a bot.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'TOO_MANY_ATTEMPTS', message: 'محاولات كثيرة جداً، حاول مرة أخرى لاحقاً' },
    })
  },
})

// Protection against automated order submission spam on checkout.
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'TOO_MANY_ORDERS', message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً' },
    })
  },
})