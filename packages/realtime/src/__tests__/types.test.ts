import { describe, expect, it } from 'vitest'
import { parseCaptionEvent, parseConversationEvent } from '../types'

describe('parseCaptionEvent', () => {
  it('유효한 caption 이벤트를 파싱한다', () => {
    const raw = JSON.stringify({
      type: 'caption',
      id: 'c1',
      seq: 3,
      lang: 'ko',
      text: '안녕하세요',
      isFinal: false,
    })
    const result = parseCaptionEvent(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.event.type).toBe('caption')
      if (result.event.type === 'caption') expect(result.event.isFinal).toBe(false)
    }
  })

  it('알 수 없는 type은 invalid-payload로 실패한다', () => {
    const result = parseCaptionEvent(JSON.stringify({ type: 'mystery' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-payload')
  })

  it('JSON이 아닌 페이로드는 invalid-payload로 실패한다', () => {
    const result = parseCaptionEvent('not json at all')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-payload')
  })
})

describe('parseConversationEvent', () => {
  it('번역이 포함된 message 이벤트를 파싱한다', () => {
    const raw = JSON.stringify({
      type: 'message',
      id: 'm1',
      role: 'patient',
      lang: 'en',
      text: 'My head hurts.',
      translation: { lang: 'ko', text: '머리가 아파요.' },
      ts: 1_700_000_000_000,
    })
    const result = parseConversationEvent(raw)
    expect(result.ok).toBe(true)
    if (result.ok && result.event.type === 'message') {
      expect(result.event.translation.lang).toBe('ko')
    }
  })

  it('role이 스키마 밖 값이면 실패한다', () => {
    const raw = JSON.stringify({ type: 'typing', role: 'doctor' })
    const result = parseConversationEvent(raw)
    expect(result.ok).toBe(false)
  })
})
