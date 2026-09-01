import { describe, expect, it } from 'vitest'
import { parseClientCommand } from '../types'

describe('parseClientCommand', () => {
  it('유효한 커맨드를 파싱한다', () => {
    const result = parseClientCommand(
      JSON.stringify({ type: 'join', roomId: 'r-1', role: 'patient', lang: 'en' }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.event).toEqual({
      type: 'join',
      roomId: 'r-1',
      role: 'patient',
      lang: 'en',
    })
  })

  it('깨진 JSON은 invalid-payload로 구분해 돌려준다', () => {
    const result = parseClientCommand('{ not json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-payload')
      expect(result.error.message).toContain('Malformed JSON')
    }
  })

  it('스키마 위반은 throw하지 않고 에러를 반환한다', () => {
    const result = parseClientCommand(JSON.stringify({ type: 'join', roomId: 'r-1' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-payload')
  })

  it('모르는 타입은 거부한다', () => {
    const result = parseClientCommand(JSON.stringify({ type: 'shout', text: 'hi' }))
    expect(result.ok).toBe(false)
  })
})
