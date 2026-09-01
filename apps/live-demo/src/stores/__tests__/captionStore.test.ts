import { beforeEach, describe, expect, it } from 'vitest'
import type { CaptionEvent } from '@thegame/realtime'
import { useCaptionStore } from '../captionStore'

const session: CaptionEvent = {
  type: 'session',
  sessionId: 's1',
  title: '기조연설',
  speaker: '김발표',
  sourceLang: 'ko',
  targetLangs: ['en', 'ja'],
}

const caption = (
  id: string,
  seq: number,
  lang: string,
  text: string,
  isFinal: boolean,
): CaptionEvent => ({ type: 'caption', id, seq, lang, text, isFinal })

const dispatch = (...events: CaptionEvent[]): void => {
  for (const event of events) useCaptionStore.getState().handleEvent(event)
}

const entries = () => useCaptionStore.getState().entries
const ids = () => entries().map((entry) => entry.id)

describe('captionStore', () => {
  beforeEach(() => {
    useCaptionStore.getState().reset()
  })

  it('session 이벤트로 세션 메타를 세운다', () => {
    dispatch(session)

    expect(useCaptionStore.getState().session).toEqual({
      id: 's1',
      title: '기조연설',
      speaker: '김발표',
      sourceLang: 'ko',
      targetLangs: ['en', 'ja'],
    })
    expect(useCaptionStore.getState().ended).toBe(false)
  })

  it('부분 자막은 같은 id의 후속 이벤트로 교체된다 (새 항목이 쌓이지 않는다)', () => {
    dispatch(session, caption('c1', 1, 'ko', '안녕', false))
    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({ sourceText: '안녕', isFinal: false })

    dispatch(caption('c1', 2, 'ko', '안녕하세', false), caption('c1', 3, 'ko', '안녕하세요', true))

    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({ id: 'c1', sourceText: '안녕하세요', isFinal: true })
  })

  it('확정 후 도착한 번역을 같은 항목에 병기로 병합한다', () => {
    dispatch(
      session,
      caption('c1', 1, 'ko', '안녕하세요', true),
      caption('c1', 2, 'en', 'Hello', true),
      caption('c1', 3, 'ja', 'こんにちは', true),
    )

    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({
      sourceText: '안녕하세요',
      isFinal: true,
      translations: { en: 'Hello', ja: 'こんにちは' },
    })
  })

  it('번역이 원문보다 먼저 와도 항목 하나로 합쳐진다', () => {
    dispatch(session, caption('c9', 1, 'en', 'Hello', true))

    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({ sourceText: '', translations: { en: 'Hello' } })

    dispatch(caption('c9', 2, 'ko', '안녕하세요', true))

    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({
      sourceText: '안녕하세요',
      isFinal: true,
      translations: { en: 'Hello' },
    })
  })

  it('재연결 복구로 앞선 seq가 재생돼도 순서가 유지되고 중복되지 않는다', () => {
    dispatch(
      session,
      caption('c1', 1, 'ko', '첫째', true),
      caption('c2', 2, 'ko', '둘째 진행중', false),
      caption('c3', 3, 'ko', '셋째 진행중', false),
    )
    expect(ids()).toEqual(['c1', 'c2', 'c3'])

    // 끊겼다 붙으면 서버가 lastEventId 이후를 재생한다 — 이미 본 id가 다시 온다
    dispatch(
      caption('c2', 2, 'ko', '둘째', true),
      caption('c3', 3, 'ko', '셋째', true),
      caption('c4', 4, 'ko', '넷째', true),
    )

    expect(ids()).toEqual(['c1', 'c2', 'c3', 'c4'])
    expect(entries().map((entry) => entry.sourceText)).toEqual(['첫째', '둘째', '셋째', '넷째'])
    expect(entries().every((entry) => entry.isFinal)).toBe(true)
  })

  it('세션이 끝난 뒤 새 session이 오면 이전 사이클 자막을 비운다', () => {
    dispatch(session, caption('c1', 1, 'ko', '첫째', true))
    dispatch({ type: 'session-ended', sessionId: 's1' })
    expect(useCaptionStore.getState().ended).toBe(true)
    expect(entries()).toHaveLength(1)

    dispatch(session)

    expect(useCaptionStore.getState().ended).toBe(false)
    expect(entries()).toEqual([])
  })

  it('heartbeat는 상태를 바꾸지 않는다', () => {
    dispatch(session, caption('c1', 1, 'ko', '첫째', true))
    const before = useCaptionStore.getState()

    dispatch({ type: 'heartbeat', ts: 1 })

    expect(useCaptionStore.getState().entries).toBe(before.entries)
    expect(useCaptionStore.getState().session).toBe(before.session)
  })

  it('reset은 상태·세션·자막·오류를 모두 되돌린다', () => {
    dispatch(session, caption('c1', 1, 'ko', '첫째', true))
    useCaptionStore.getState().setStatus({ state: 'open' })
    useCaptionStore.getState().setError('stream-failed')

    useCaptionStore.getState().reset()

    expect(useCaptionStore.getState()).toMatchObject({
      status: { state: 'idle' },
      session: null,
      entries: [],
      ended: false,
      lastError: null,
    })
  })
})
