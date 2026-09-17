// Business-rule error that a controller turns into a JSON error response.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}