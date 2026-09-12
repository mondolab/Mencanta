export class AppError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function badRequest(code: string, message: string, details?: unknown): AppError {
  return new AppError(400, code, message, details)
}

export function unauthorized(message = 'Debes iniciar sesión.'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message)
}

export function forbidden(message = 'No tenés permisos para realizar esta acción.'): AppError {
  return new AppError(403, 'FORBIDDEN', message)
}

export function notFound(message = 'No se encontró el recurso.'): AppError {
  return new AppError(404, 'NOT_FOUND', message)
}

export function conflict(code: string, message: string): AppError {
  return new AppError(409, code, message)
}

export function serverError(code = 'INTERNAL', message = 'Error interno del servidor.'): AppError {
  return new AppError(500, code, message)
}

export function tooMany(message: string): AppError {
  return new AppError(429, 'RATE_LIMITED', message)
}