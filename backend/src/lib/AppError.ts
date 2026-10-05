export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Bad request') {
    return new AppError(400, message, 'BAD_REQUEST');
  }
  static unauthorized(message = 'Unauthenticated', code = 'UNAUTHENTICATED') {
    return new AppError(401, message, code);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(resource = 'Resource') {
    return new AppError(404, `${resource} not found`, 'NOT_FOUND');
  }
  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT');
  }
}
