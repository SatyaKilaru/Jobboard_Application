/**
 * Wraps an API call and returns { data, error } instead of throwing.
 * error shape: { code: string, message: string }
 */
export const apiHelper = async (fn) => {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    if (!err.response) {
      return {
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Server is waking up — please wait a moment and try again',
        },
      }
    }
    const code = err.response.data?.code
    const message = err.response.data?.message
    return { data: null, error: { code, message: message || 'An unexpected error occurred' } }
  }
}