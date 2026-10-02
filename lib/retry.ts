/**
 * Retry helper for Notion's unofficial API.
 *
 * Notion intermittently returns 403 Forbidden (or hangs / times out) for
 * datacenter IPs on endpoints like `loadPageChunk`. A single failed request
 * must not take down page renders, so every Notion call site wraps its fetch
 * in `withRetry`.
 */

const RETRYABLE_STATUS_CODES = new Set([403, 408, 429, 500, 502, 503, 504])

export function isRetryableError(err: any): boolean {
  const status =
    err?.response?.status ?? err?.statusCode ?? err?.status ?? undefined

  if (typeof status === 'number' && RETRYABLE_STATUS_CODES.has(status)) {
    return true
  }

  // ky network/timeout errors
  const name = err?.name ?? ''
  if (name === 'TimeoutError' || name === 'FetchError') {
    return true
  }

  const message = String(err?.message ?? '').toLowerCase()
  return /timeout|timed out|econnreset|econnrefused|enotfound|socket hang up|fetch failed|network/i.test(
    message
  )
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 5,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    label = 'request'
  }: {
    attempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    label?: string
  } = {}
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= attempts; ++attempt) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err

      if (!isRetryableError(err) || attempt === attempts) {
        throw err
      }

      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      const jitter = Math.random() * 500
      const waitMs = Math.round(delay + jitter)

      console.warn(
        `retry "${label}": attempt ${attempt}/${attempts} failed (${err?.message}); retrying in ${waitMs}ms`
      )

      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }

  throw lastError
}
