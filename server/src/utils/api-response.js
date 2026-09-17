// Consistent JSON envelopes for every API response.
export function successResponse(res, data, status = 200) {
  return res.status(status).json({ success: true, ...data })
}

export function errorResponse(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } })
}