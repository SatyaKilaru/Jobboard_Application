/**
 * Wraps an API call and returns { data, error } instead of throwing.
 * error shape: { code: string, message: string }
 */
export const apiHelper = async (fn) => {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    const code = err?.response?.data?.code
    const message = err?.response?.data?.message
    return { data: null, error: { code, message: message || 'An unexpected error occurred' } }
  }
}
