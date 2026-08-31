export interface BackoffOptions {
  initialDelayMs?: number
  maxDelayMs?: number
  factor?: number
  /** full jitter — 동시 재연결 폭주(thundering herd)를 피한다 */
  jitter?: boolean
  /** 테스트 주입용 */
  random?: () => number
}

export function backoffDelayMs(attempt: number, options: BackoffOptions = {}): number {
  const {
    initialDelayMs = 500,
    maxDelayMs = 15_000,
    factor = 2,
    jitter = true,
    random = Math.random,
  } = options
  const exponential = Math.min(maxDelayMs, initialDelayMs * factor ** attempt)
  return jitter ? Math.round(random() * exponential) : exponential
}
