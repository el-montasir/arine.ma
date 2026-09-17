import { ApiError } from './api-error.js'
import { errorResponse } from './api-response.js'

// Wraps an async controller so business-rule ApiErrors become JSON responses
// and anything unexpected continues to the centralized error handler.
export function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (err instanceof ApiError) {
        return errorResponse(res, err.status, err.code, err.message)
      }
      next(err)
    })
}