import { describe, expect, it } from 'vitest'
import { backoffDelayMs } from '../backoff'

describe('backoffDelayMs', () => {
  it('jitter 없이 지수적으로 증가한다', () => {
    const options = { initialDelayMs: 100, factor: 2, maxDelayMs: 10_000, jitter: false }
    expect(backoffDelayMs(0, options)).toBe(100)
    expect(backoffDelayMs(1, options)).toBe(200)
    expect(backoffDelayMs(3, options)).toBe(800)
  })

  it('maxDelayMs를 넘지 않는다', () => {
    expect(backoffDelayMs(20, { initialDelayMs: 500, maxDelayMs: 15_000, jitter: false })).toBe(15_000)
  })

  it('full jitter는 [0, 지수값] 범위에서 뽑는다', () => {
    expect(backoffDelayMs(2, { initialDelayMs: 100, jitter: true, random: () => 0.5 })).toBe(200)
    expect(backoffDelayMs(2, { initialDelayMs: 100, jitter: true, random: () => 0 })).toBe(0)
  })
})
