import { beforeEach, describe, expect, it } from 'vitest'
import type { CaptionEvent } from '@thegame/realtime'
import { useCaptionStore } from '../captionStore'

/**
 * 자막 리렌더 회귀 방지 (S08 / docs/perf/001-자막-리렌더.md).
 *
 * 리렌더의 원인은 화면이 아니라 **스토어의 모양**이었다: 부분 자막이 `entries` 배열을
 * 통째로 갈아치우면 리스트 전체가 다시 렌더된다. 그래서 여기서 못박는 계약은 하나다 —
 * **부분 자막 이벤트는 `entries` 참조를 건드리지 않는다.**
 * 이게 깨지면 성능 회귀가 조용히 돌아온다(화면은 멀쩡히 동작하므로 다른 테스트로는 안 잡힌다).
 */

const session: CaptionEvent = {
  type: 'session',
  sessionId: 'keynote-01',
  title: 'Recent Advances',
  speaker: 'Dr. Kim',
  sourceLang: 'ko',
  targetLangs: ['en', 'ja'],
}

let seq = 0
const caption = (
  id: string,
  text: string,
  options: { lang?: string; isFinal?: boolean } = {},
): CaptionEvent => {
  seq += 1
  return {
    type: 'caption',
    id,
    seq,
    lang: options.lang ?? 'ko',
    text,
    isFinal: options.isFinal ?? false,
  }
}

const send = (...events: CaptionEvent[]): void => {
  for (const event of events) useCaptionStore.getState().handleEvent(event)
}

const state = () => useCaptionStore.getState()

beforeEach(() => {
  seq = 0
  useCaptionStore.getState().reset()
  send(session)
})

describe('부분 자막 (진행 중인 문장)', () => {
  it('아무리 많이 와도 확정 리스트의 참조가 바뀌지 않는다', () => {
    send(caption('s01', '안녕하세요', { isFinal: true }))
    const entries = state().entries

    for (let i = 1; i <= 50; i += 1) {
      send(caption('s02', `단어 ${i}`))
    }

    expect(state().entries).toBe(entries)
    expect(state().partial?.sourceText).toBe('단어 50')
  })

  it('리스트에 들어가지 않고 partial에만 담긴다', () => {
    send(caption('s01', '오늘은'))

    expect(state().entries).toEqual([])
    expect(state().partial).toEqual({
      id: 's01',
      sourceText: '오늘은',
      isFinal: false,
      translations: {},
    })
  })

  it('다음 문장이 시작되면 이전 부분 자막을 대체한다', () => {
    send(caption('s01', '첫 문장'), caption('s02', '둘째 문장'))

    expect(state().partial?.id).toBe('s02')
    expect(state().entries).toEqual([])
  })
})

describe('확정 자막', () => {
  it('리스트에 들어가고 진행 중 표시는 사라진다', () => {
    send(caption('s01', '안녕'), caption('s01', '안녕하세요', { isFinal: true }))

    expect(state().partial).toBeNull()
    expect(state().entries).toEqual([
      { id: 's01', sourceText: '안녕하세요', isFinal: true, translations: {} },
    ])
  })

  it('앞선 자막 줄의 객체 참조는 그대로다 — memo된 CaptionRow가 걸러낼 수 있게', () => {
    send(caption('s01', '첫 문장', { isFinal: true }))
    const first = state().entries[0]

    send(caption('s02', '둘째 문장', { isFinal: true }))

    expect(state().entries[0]).toBe(first)
    expect(state().entries).toHaveLength(2)
  })

  it('번역이 도착하면 그 줄만 새 객체가 된다', () => {
    send(
      caption('s01', '첫 문장', { isFinal: true }),
      caption('s02', '둘째 문장', { isFinal: true }),
    )
    const [first, second] = state().entries

    send(caption('s02', 'second sentence', { lang: 'en', isFinal: true }))

    expect(state().entries[0]).toBe(first)
    expect(state().entries[1]).not.toBe(second)
    expect(state().entries[1]?.translations).toEqual({ en: 'second sentence' })
  })
})

describe('도착 순서가 어긋난 경우 (재연결 복구)', () => {
  it('원문 없이 번역만 오면 예전처럼 자리표시자를 만든다', () => {
    send(caption('s09', 'translation only', { lang: 'en', isFinal: true }))

    expect(state().entries).toEqual([
      { id: 's09', sourceText: '', isFinal: false, translations: { en: 'translation only' } },
    ])
    expect(state().partial).toBeNull()
  })

  it('진행 중인 문장의 번역은 그 문장에 붙고 리스트는 그대로다', () => {
    send(caption('s01', '첫 문장', { isFinal: true }))
    const entries = state().entries

    send(caption('s02', '진행 중'), caption('s02', 'in progress', { lang: 'en', isFinal: true }))

    expect(state().entries).toBe(entries)
    expect(state().partial?.translations).toEqual({ en: 'in progress' })
  })

  it('확정될 때 진행 중이던 번역을 이어받는다', () => {
    send(
      caption('s02', '진행 중'),
      caption('s02', 'in progress', { lang: 'en', isFinal: true }),
      caption('s02', '진행 중이었던 문장', { isFinal: true }),
    )

    expect(state().partial).toBeNull()
    expect(state().entries).toEqual([
      {
        id: 's02',
        sourceText: '진행 중이었던 문장',
        isFinal: true,
        translations: { en: 'in progress' },
      },
    ])
  })
})

describe('세션 경계', () => {
  it('세션이 끝나면 확정되지 못한 문장은 남기지 않는다', () => {
    send(caption('s01', '말하다 만 문장'))
    send({ type: 'session-ended', sessionId: 'keynote-01' })

    expect(state().ended).toBe(true)
    expect(state().partial).toBeNull()
  })

  it('세션 루프가 다시 시작되면 히스토리와 진행 중 자막을 모두 비운다', () => {
    send(caption('s01', '지난 사이클', { isFinal: true }))
    send({ type: 'session-ended', sessionId: 'keynote-01' })
    send(caption('s01', '남아 있던 부분 자막'))
    send(session)

    expect(state().entries).toEqual([])
    expect(state().partial).toBeNull()
    expect(state().ended).toBe(false)
  })

  it('reset은 진행 중 자막까지 비운다', () => {
    send(caption('s01', '진행 중'))
    useCaptionStore.getState().reset()

    expect(state().partial).toBeNull()
    expect(state().entries).toEqual([])
  })
})

describe('자막과 무관한 이벤트', () => {
  it('하트비트는 리스트도 진행 중 자막도 건드리지 않는다', () => {
    send(caption('s01', '첫 문장', { isFinal: true }), caption('s02', '진행 중'))
    const { entries, partial } = state()

    send({ type: 'heartbeat', ts: Date.now() })

    expect(state().entries).toBe(entries)
    expect(state().partial).toBe(partial)
  })
})
