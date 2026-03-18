/**
 * Wraps an API call and returns { data, error } instead of throwing.
 * error shape: { code: string, message: string, status: number }
 */
export const apiHelper = async (fn) => {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    const resp = err?.response
    if (resp) {
      return {
        data: null,
        error: {
          code: resp.data?.code || 'UNKNOWN_ERROR',
          message: resp.data?.message || 'Something went wrong',
          status: resp.status,
        },
      }
    }
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Server is waking up — please wait a moment and try again',
        status: 0,
      },
    }
  }
}
