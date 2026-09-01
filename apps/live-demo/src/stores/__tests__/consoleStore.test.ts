import { beforeEach, describe, expect, it } from 'vitest'
import type { SessionStatus, SessionSummary } from '@thegame/realtime'
import { useConsoleStore } from '../consoleStore'

const session: SessionSummary = {
  id: 'ab12cd',
  title: '기조연설',
  speaker: '김서연',
  sourceLang: 'ko',
  targetLangs: ['en', 'ja'],
  state: 'waiting',
  viewerCount: 0,
}

const status = (patch: Partial<SessionStatus> = {}): SessionStatus => ({
  state: 'playing',
  viewerCount: 3,
  position: 2,
  total: 10,
  rate: 1,
  ...patch,
})

const store = () => useConsoleStore.getState()

describe('consoleStore', () => {
  beforeEach(() => {
    useConsoleStore.getState().close()
  })

  it('세션을 열면 이전 세션의 상태·실패가 남지 않는다', () => {
    store().applyStatus(status(), 'poll')
    store().applyFailure({ code: 'invalid-transition', message: 'nope' }, 'control')

    store().open(session)

    expect(store().session).toEqual(session)
    expect(store().status).toBeNull()
    expect(store().pending).toBeNull()
    expect(store().failure).toBeNull()
  })

  it('폴링 결과를 그대로 반영한다', () => {
    store().open(session)

    store().applyStatus(status({ state: 'paused', viewerCount: 7 }), 'poll')

    expect(store().status).toEqual(status({ state: 'paused', viewerCount: 7 }))
  })

  it('제어 응답을 기다리는 동안 도착한 폴링 결과는 버린다', () => {
    store().open(session)
    store().applyStatus(status({ state: 'waiting', position: 0 }), 'poll')
    store().begin('start')

    // 시작을 누르기 직전 상태를 담고 출발한 폴링 — 반영하면 화면이 되감긴다
    store().applyStatus(status({ state: 'waiting', position: 0 }), 'poll')

    expect(store().status?.state).toBe('waiting')
    expect(store().pending).toBe('start')

    store().applyStatus(status({ state: 'playing', position: 1 }), 'control')

    expect(store().status?.state).toBe('playing')
    expect(store().pending).toBeNull()
  })

  it('제어 실패는 대기를 풀고 화면에 남긴다', () => {
    store().open(session)
    store().begin('pause')

    store().applyFailure({ code: 'invalid-transition', message: 'cannot pause' }, 'control')

    expect(store().pending).toBeNull()
    expect(store().failure).toEqual({ code: 'invalid-transition', message: 'cannot pause' })
  })

  it('조작 실패는 이어지는 폴링에도 남고, 다음 조작을 시작할 때 사라진다', () => {
    store().open(session)
    store().begin('start')
    store().applyFailure({ code: 'invalid-transition', message: 'cannot start' }, 'control')

    store().applyStatus(status(), 'poll')
    expect(store().failure?.code).toBe('invalid-transition')

    store().begin('end')
    expect(store().failure).toBeNull()
  })

  it('연결이 돌아오면 네트워크 실패 안내는 스스로 사라진다', () => {
    store().open(session)
    store().applyFailure({ code: 'network', message: 'fetch failed' }, 'poll')
    expect(store().failure?.code).toBe('network')

    store().applyStatus(status(), 'poll')

    expect(store().failure).toBeNull()
  })

  it('제어 대기 중의 폴링 실패는 대기를 풀지 않는다', () => {
    store().open(session)
    store().begin('end')

    store().applyFailure({ code: 'network', message: 'fetch failed' }, 'poll')

    expect(store().pending).toBe('end')
    expect(store().failure).toBeNull()
  })

  it('닫으면 목록 화면으로 돌아간다', () => {
    store().open(session)
    store().applyStatus(status(), 'poll')

    store().close()

    expect(store().session).toBeNull()
    expect(store().status).toBeNull()
  })
})
