export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
}

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Incorrect email or password',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered',
  VALIDATION_ERROR: 'Please check your input and try again',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  INTERNAL_ERROR: 'Something went wrong. Please try again',
  QUERY_FAILED: 'Failed to load data. Please try again',
}
