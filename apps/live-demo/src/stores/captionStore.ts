import { create } from 'zustand'
import type { CaptionEvent, ConnectionStatus } from '@thegame/realtime'

export interface SessionMeta {
  id: string
  title: string
  speaker: string
  sourceLang: string
  targetLangs: string[]
}

export interface CaptionEntry {
  id: string
  sourceText: string
  isFinal: boolean
  translations: Record<string, string>
}

interface CaptionState {
  status: ConnectionStatus
  session: SessionMeta | null
  /**
   * 자막 히스토리. **확정 이벤트에만 바뀐다** — 진행 중인 부분 자막은 여기에 넣지 않는다.
   * 부분 자막마다 이 배열을 새로 만들면 리스트 전체가 리렌더된다(docs/perf/001).
   */
  entries: CaptionEntry[]
  /** 진행 중인 원문 한 줄. 단어마다 바뀌므로 리스트와 분리해 둔다 */
  partial: CaptionEntry | null
  ended: boolean
  lastError: string | null
  setStatus: (status: ConnectionStatus) => void
  setError: (message: string) => void
  handleEvent: (event: CaptionEvent) => void
  reset: () => void
}

const MAX_ENTRIES = 200

type CaptionMessage = Extract<CaptionEvent, { type: 'caption' }>

/** 새 항목을 히스토리 끝에 붙인다 (오래된 것부터 잘라낸다) */
function append(entries: CaptionEntry[], entry: CaptionEntry): CaptionEntry[] {
  return [...entries.slice(-(MAX_ENTRIES - 1)), entry]
}

/** 히스토리의 한 항목만 갈아끼운다 — 나머지 항목의 객체 참조는 그대로 둔다 (memo가 걸러낼 수 있게) */
function replaceAt(entries: CaptionEntry[], index: number, entry: CaptionEntry): CaptionEntry[] {
  const next = entries.slice()
  next[index] = entry
  return next
}

/** 확정된 원문 — 히스토리에 반영한다. 진행 중이던 같은 문장의 번역은 이어받는다 */
function commitSource(
  entries: CaptionEntry[],
  event: CaptionMessage,
  partial: CaptionEntry | null,
): CaptionEntry[] {
  const index = entries.findIndex((entry) => entry.id === event.id)
  const current = index === -1 ? undefined : entries[index]
  const carried = partial !== null && partial.id === event.id ? partial.translations : {}
  const entry: CaptionEntry = {
    id: event.id,
    sourceText: event.text,
    isFinal: event.isFinal,
    translations: { ...carried, ...(current?.translations ?? {}) },
  }
  return current === undefined ? append(entries, entry) : replaceAt(entries, index, entry)
}

/**
 * 번역 도착. 원문이 이미 히스토리에 있으면 거기에 붙이고, 아직 진행 중인 문장이면
 * 부분 자막에 붙인다. 둘 다 아니면(재연결 복구 창 밖의 자막) 예전처럼 자리표시자를 만든다.
 */
function applyTranslation(
  state: { entries: CaptionEntry[]; partial: CaptionEntry | null },
  event: CaptionMessage,
): Partial<CaptionState> {
  const index = state.entries.findIndex((entry) => entry.id === event.id)
  const current = index === -1 ? undefined : state.entries[index]
  if (current !== undefined) {
    const updated = { ...current, translations: { ...current.translations, [event.lang]: event.text } }
    return { entries: replaceAt(state.entries, index, updated) }
  }

  const { partial } = state
  if (partial !== null && partial.id === event.id) {
    return { partial: { ...partial, translations: { ...partial.translations, [event.lang]: event.text } } }
  }

  const placeholder: CaptionEntry = {
    id: event.id,
    sourceText: '',
    isFinal: false,
    translations: { [event.lang]: event.text },
  }
  return { entries: append(state.entries, placeholder) }
}

export const useCaptionStore = create<CaptionState>((set) => ({
  status: { state: 'idle' },
  session: null,
  entries: [],
  partial: null,
  ended: false,
  lastError: null,

  setStatus: (status) => set({ status }),
  setError: (message) => set({ lastError: message }),
  reset: () =>
    set({
      status: { state: 'idle' },
      session: null,
      entries: [],
      partial: null,
      ended: false,
      lastError: null,
    }),

  handleEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'session':
          return {
            session: {
              id: event.sessionId,
              title: event.title,
              speaker: event.speaker,
              sourceLang: event.sourceLang,
              targetLangs: event.targetLangs,
            },
            // 세션 루프가 재시작되면 이전 사이클의 자막을 비운다
            entries: state.ended ? [] : state.entries,
            partial: state.ended ? null : state.partial,
            ended: false,
          }
        case 'caption': {
          const sourceLang = state.session?.sourceLang
          const isSource = sourceLang === undefined || event.lang === sourceLang
          if (!isSource) return applyTranslation(state, event)

          if (!event.isFinal) {
            // 진행 중 원문 — **히스토리는 건드리지 않는다**. 같은 문장이면 번역만 이어받는다
            const carried =
              state.partial !== null && state.partial.id === event.id ? state.partial.translations : {}
            return {
              partial: { id: event.id, sourceText: event.text, isFinal: false, translations: carried },
            }
          }

          return {
            entries: commitSource(state.entries, event, state.partial),
            partial: state.partial !== null && state.partial.id === event.id ? null : state.partial,
          }
        }
        case 'session-ended':
          // 확정되지 못한 채 끊긴 문장은 남겨두지 않는다
          return { ended: true, partial: null }
        case 'heartbeat':
          return {}
      }
    }),
}))
