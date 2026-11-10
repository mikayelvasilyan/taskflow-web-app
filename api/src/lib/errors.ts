export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface ErrorDetail {
  path: string;
  message: string;
}

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError('VALIDATION_ERROR', message, details);
export const unauthenticated = (message = 'Authentication required') =>
  new AppError('UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have permission to do this') =>
  new AppError('FORBIDDEN', message);
export const notFound = (what = 'Resource') => new AppError('NOT_FOUND', `${what} not found`);
export const conflict = (message: string) => new AppError('CONFLICT', message);
