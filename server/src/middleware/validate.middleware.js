import { errorResponse } from '../utils/api-response.js'

// Validates req.body against a Zod schema and attaches the parsed result
// to req.validated. Returns HTTP 400 with a clean Arabic message otherwise.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const first = result.error.issues[0]
      const message = first?.message || 'بيانات الطلب غير صحيحة'
      return errorResponse(res, 400, 'VALIDATION_ERROR', message)
    }
    req.validated = result.data
    next()
  }
}