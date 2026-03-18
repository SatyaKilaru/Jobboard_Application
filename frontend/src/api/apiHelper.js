/**
 * Wraps an API call and returns { data, error } instead of throwing.
 * error shape: { code: string, message: string, status: number }
 *   status 0    = network error (service sleeping / no internet)
 *   status 4xx  = client error (from backend)
 *   status 5xx  = server error (from backend)
 */
export const apiHelper = async (fn) => {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    // Axios error with server response (4xx, 5xx)
    if (err?.response?.data) {
      return {
        data: null,
        error: {
          code: err.response.data.code || 'UNKNOWN_ERROR',
          message: err.response.data.message || 'An unexpected error occurred',
          status: err.response.status,
        },
      }
    }

    // Response exists but body is empty (CORS blocked)
    if (err?.response) {
      return {
        data: null,
        error: {
          code: 'EMPTY_RESPONSE',
          message: `Server returned ${err.response.status} with no details`,
          status: err.response.status,
        },
      }
    }

    // No response at all — network error (service sleeping, no internet, DNS failure)
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
