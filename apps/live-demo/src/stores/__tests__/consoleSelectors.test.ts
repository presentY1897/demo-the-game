import { describe, expect, it } from 'vitest'
import type { SessionState, SessionStatus } from '@thegame/realtime'
import {
  canSetRate,
  canTransition,
  selectControls,
  selectProgress,
  stepRate,
} from '../consoleSelectors'

const status = (patch: Partial<SessionStatus> = {}): SessionStatus => ({
  state: 'waiting',
  viewerCount: 0,
  position: 0,
  total: 10,
  rate: 1,
  ...patch,
})

describe('canTransition', () => {
  const cases: [SessionState, string[]][] = [
    ['waiting', ['start', 'end']],
    ['playing', ['pause', 'end']],
    ['paused', ['resume', 'end']],
    ['ended', []],
  ]

  it.each(cases)('%s 상태에서는 %s만 허용한다', (state, allowed) => {
    for (const action of ['start', 'pause', 'resume', 'end'] as const) {
      expect(canTransition(state, action)).toBe(allowed.includes(action))
    }
  })

  it('종료된 세션은 속도도 못 바꾼다', () => {
    expect(canSetRate('playing')).toBe(true)
    expect(canSetRate('paused')).toBe(true)
    expect(canSetRate('ended')).toBe(false)
  })
})

describe('stepRate', () => {
  it('한 단계는 0.25배다', () => {
    expect(stepRate(1, 1)).toBe(1.25)
    expect(stepRate(1, -1)).toBe(0.75)
  })

  it('경계 밖으로 나가지 않는다', () => {
    expect(stepRate(2, 1)).toBe(2)
    expect(stepRate(0.5, -1)).toBe(0.5)
    expect(stepRate(1.9, 1)).toBe(2)
    expect(stepRate(0.6, -1)).toBe(0.5)
  })

  it('부동소수점 찌꺼기를 남기지 않는다', () => {
    expect(stepRate(stepRate(stepRate(1, 1), 1), 1)).toBe(1.75)
    expect(stepRate(1.1, 1)).toBe(1.35)
  })
})

describe('selectControls', () => {
  it('상태를 아직 모르면 전부 잠근다', () => {
    expect(selectControls(null, null)).toEqual({
      start: false,
      pause: false,
      resume: false,
      end: false,
      slower: false,
      faster: false,
    })
  })

  it('대기 중에는 시작과 종료만 열린다', () => {
    const controls = selectControls(status({ state: 'waiting' }), null)

    expect(controls.start).toBe(true)
    expect(controls.end).toBe(true)
    expect(controls.pause).toBe(false)
    expect(controls.resume).toBe(false)
  })

  it('재생 중에는 일시정지·종료가 열리고 시작은 잠긴다', () => {
    const controls = selectControls(status({ state: 'playing' }), null)

    expect(controls.pause).toBe(true)
    expect(controls.end).toBe(true)
    expect(controls.start).toBe(false)
    expect(controls.resume).toBe(false)
  })

  it('일시정지 중에는 재개가 열린다', () => {
    const controls = selectControls(status({ state: 'paused' }), null)

    expect(controls.resume).toBe(true)
    expect(controls.pause).toBe(false)
  })

  it('종료된 세션은 아무 버튼도 열리지 않는다', () => {
    const controls = selectControls(status({ state: 'ended', rate: 1 }), null)

    expect(controls).toEqual({
      start: false,
      pause: false,
      resume: false,
      end: false,
      slower: false,
      faster: false,
    })
  })

  it('앞선 요청이 떠 있으면 전부 잠근다 — 연타로 409를 만들지 않는다', () => {
    const controls = selectControls(status({ state: 'waiting' }), 'start')

    expect(controls.start).toBe(false)
    expect(controls.end).toBe(false)
  })

  it('속도 버튼은 경계값에서 잠긴다', () => {
    expect(selectControls(status({ state: 'playing', rate: 2 }), null).faster).toBe(false)
    expect(selectControls(status({ state: 'playing', rate: 2 }), null).slower).toBe(true)
    expect(selectControls(status({ state: 'playing', rate: 0.5 }), null).slower).toBe(false)
    expect(selectControls(status({ state: 'playing', rate: 0.5 }), null).faster).toBe(true)
  })
})

describe('selectProgress', () => {
  it('상태를 모르거나 문장이 없으면 0이다 (NaN 금지)', () => {
    expect(selectProgress(null)).toBe(0)
    expect(selectProgress(status({ total: 0, position: 0 }))).toBe(0)
  })

  it('position/total 비율을 1로 잘라 돌려준다', () => {
    expect(selectProgress(status({ position: 5, total: 10 }))).toBe(0.5)
    expect(selectProgress(status({ position: 12, total: 10 }))).toBe(1)
  })
})
