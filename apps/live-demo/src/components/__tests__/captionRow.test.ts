import { beforeEach, describe, expect, it } from 'vitest'
import type { CaptionEvent } from '@thegame/realtime'
import { useCaptionStore, type CaptionEntry } from '../../stores/captionStore'
import { CaptionRow } from '../CaptionRow'

/**
 * 자막 줄 리렌더 회귀 방지 (S08 / docs/perf/001-자막-리렌더.md).
 *
 * 확정 자막이 하나 들어오면 `entries`는 새 배열이 되고 FlatList의 셀이 전부 다시
 * 렌더된다(`CellRenderer`에는 `shouldComponentUpdate`가 없다). 그걸 막는 건 `CaptionRow`의
 * memo뿐이고, memo는 **props가 실제로 안정적일 때만** 일한다. 그래서 둘 다 검사한다.
 *
 * 렌더는 하지 않는다 — 모듈의 형태와 스토어가 내보내는 props만 본다(RN 렌더 테스트는 S10 범위 제외).
 */

const MEMO = Symbol.for('react.memo')

/** React가 memo에서 쓰는 기본 비교와 같은 규칙 */
function arePropsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}

const propsFor = (entry: CaptionEntry) => ({ entry, targetLang: 'en', scale: 1 })

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

beforeEach(() => {
  seq = 0
  useCaptionStore.getState().reset()
  send({
    type: 'session',
    sessionId: 'keynote-01',
    title: 'Recent Advances',
    speaker: 'Dr. Kim',
    sourceLang: 'ko',
    targetLangs: ['en'],
  })
  send(
    caption('s01', '첫 문장', { isFinal: true }),
    caption('s02', '둘째 문장', { isFinal: true }),
    caption('s03', '셋째 문장', { isFinal: true }),
  )
})

describe('CaptionRow', () => {
  it('memo 컴포넌트다 — 벗기면 확정 자막마다 리스트 전체가 다시 렌더된다', () => {
    const component = CaptionRow as unknown as { $$typeof: symbol; type: { name: string } }

    expect(component.$$typeof).toBe(MEMO)
    // 프로파일러가 커밋 내용을 이름으로 집계한다 (docs/perf/001의 계측 방식).
    // 번들러가 같은 스코프의 const와 겹치지 않게 뒤에 숫자를 붙이므로 접두사로 본다.
    expect(component.type.name.startsWith('CaptionRow')).toBe(true)
  })
})

describe('memo가 걸러낼 수 있는 props인가', () => {
  it('부분 자막이 쏟아져도 모든 줄의 props가 그대로다', () => {
    const before = useCaptionStore.getState().entries.map(propsFor)

    for (let i = 1; i <= 30; i += 1) send(caption('s04', `단어 ${i}`))

    const after = useCaptionStore.getState().entries.map(propsFor)
    expect(after).toHaveLength(before.length)
    expect(after.every((props, index) => arePropsEqual(before[index] ?? {}, props))).toBe(true)
  })

  it('확정 자막이 하나 늘어도 기존 줄의 props는 그대로다', () => {
    const before = useCaptionStore.getState().entries.map(propsFor)

    send(caption('s04', '넷째 문장', { isFinal: true }))

    const after = useCaptionStore.getState().entries.map(propsFor)
    expect(after).toHaveLength(before.length + 1)
    expect(before.every((props, index) => arePropsEqual(props, after[index] ?? {}))).toBe(true)
  })

  it('번역이 도착하면 그 줄의 props만 달라진다', () => {
    const before = useCaptionStore.getState().entries.map(propsFor)

    send(caption('s02', 'second sentence', { lang: 'en', isFinal: true }))

    const after = useCaptionStore.getState().entries.map(propsFor)
    const changed = after
      .map((props, index) => (arePropsEqual(before[index] ?? {}, props) ? null : index))
      .filter((index) => index !== null)

    expect(changed).toEqual([1])
  })
})
