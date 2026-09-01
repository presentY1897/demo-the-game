import { describe, expect, it } from 'vitest'
import {
  createSessionRequestSchema,
  decodeSessionList,
  decodeSessionStatus,
  rateRequestSchema,
  sessionStateSchema,
} from '../http'

const summary = {
  id: 'keynote-01',
  title: 'Recent Advances in Laser Toning',
  speaker: 'Dr. Seoyeon Kim',
  sourceLang: 'ko',
  targetLangs: ['en', 'ja', 'zh'],
  state: 'waiting',
  viewerCount: 0,
}

describe('sessionListSchema', () => {
  it('state·viewerCount가 붙은 세션 목록을 파싱한다', () => {
    const result = decodeSessionList([summary])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value[0]?.state).toBe('waiting')
      expect(result.value[0]?.viewerCount).toBe(0)
    }
  })

  it('state가 없는 예전 응답은 실패한다 — 계약이 바뀐 것을 즉시 드러낸다', () => {
    const { state: _state, viewerCount: _viewerCount, ...legacy } = summary
    expect(decodeSessionList([legacy]).ok).toBe(false)
  })

  it('알 수 없는 state 값을 거부한다', () => {
    expect(sessionStateSchema.safeParse('rewinding').success).toBe(false)
    expect(decodeSessionList([{ ...summary, state: 'rewinding' }]).ok).toBe(false)
  })
})

describe('sessionStatusSchema', () => {
  it('상태 응답을 파싱한다', () => {
    const result = decodeSessionStatus({
      state: 'playing',
      viewerCount: 2,
      position: 3,
      total: 10,
      rate: 1.5,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.position).toBe(3)
  })

  it('음수 position을 거부한다', () => {
    const result = decodeSessionStatus({
      state: 'playing',
      viewerCount: 0,
      position: -1,
      total: 10,
      rate: 1,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-payload')
  })
})

describe('createSessionRequestSchema', () => {
  it('유효한 생성 요청을 통과시킨다', () => {
    const parsed = createSessionRequestSchema.safeParse({
      title: ' 세션 제목 ',
      speaker: '김서연',
      sourceLang: 'ko',
      targetLangs: ['en'],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.title).toBe('세션 제목')
  })

  it('빈 제목과 빈 targetLangs를 거부한다', () => {
    expect(
      createSessionRequestSchema.safeParse({
        title: '   ',
        speaker: '김서연',
        sourceLang: 'ko',
        targetLangs: ['en'],
      }).success,
    ).toBe(false)
    expect(
      createSessionRequestSchema.safeParse({
        title: '제목',
        speaker: '김서연',
        sourceLang: 'ko',
        targetLangs: [],
      }).success,
    ).toBe(false)
  })
})

describe('rateRequestSchema', () => {
  it.each([0.5, 1, 2])('경계 포함 %s를 허용한다', (rate) => {
    expect(rateRequestSchema.safeParse({ rate }).success).toBe(true)
  })

  it.each([0.49, 2.01, 0, -1])('범위 밖 %s를 거부한다', (rate) => {
    expect(rateRequestSchema.safeParse({ rate }).success).toBe(false)
  })

  it('숫자가 아닌 rate를 거부한다', () => {
    expect(rateRequestSchema.safeParse({ rate: '1.5' }).success).toBe(false)
  })
})
