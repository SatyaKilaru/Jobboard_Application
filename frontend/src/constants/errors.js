export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  WRONG_PASSWORD: 'WRONG_PASSWORD',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
}

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Incorrect email or password',
  ACCOUNT_NOT_FOUND: 'No account found with this email',
  WRONG_PASSWORD: 'Incorrect password — please try again',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered',
  VALIDATION_ERROR: 'Please check your input and try again',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  INTERNAL_ERROR: 'Something went wrong. Please try again',
  QUERY_FAILED: 'Failed to load data. Please try again',
  NETWORK_ERROR: 'Server is waking up — please wait a moment and try again',
}
