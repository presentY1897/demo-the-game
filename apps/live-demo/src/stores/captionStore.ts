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
  entries: CaptionEntry[]
  ended: boolean
  lastError: string | null
  setStatus: (status: ConnectionStatus) => void
  setError: (message: string) => void
  handleEvent: (event: CaptionEvent) => void
  reset: () => void
}

const MAX_ENTRIES = 200

function upsertEntry(
  entries: CaptionEntry[],
  event: Extract<CaptionEvent, { type: 'caption' }>,
  sourceLang: string | undefined,
): CaptionEntry[] {
  const isSource = sourceLang === undefined || event.lang === sourceLang
  const index = entries.findIndex((entry) => entry.id === event.id)

  if (index === -1) {
    const entry: CaptionEntry = isSource
      ? { id: event.id, sourceText: event.text, isFinal: event.isFinal, translations: {} }
      : { id: event.id, sourceText: '', isFinal: false, translations: { [event.lang]: event.text } }
    return [...entries.slice(-(MAX_ENTRIES - 1)), entry]
  }

  const current = entries[index]
  if (!current) return entries
  const updated: CaptionEntry = isSource
    ? { ...current, sourceText: event.text, isFinal: event.isFinal }
    : { ...current, translations: { ...current.translations, [event.lang]: event.text } }
  const next = entries.slice()
  next[index] = updated
  return next
}

export const useCaptionStore = create<CaptionState>((set) => ({
  status: { state: 'idle' },
  session: null,
  entries: [],
  ended: false,
  lastError: null,

  setStatus: (status) => set({ status }),
  setError: (message) => set({ lastError: message }),
  reset: () =>
    set({ status: { state: 'idle' }, session: null, entries: [], ended: false, lastError: null }),

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
            ended: false,
          }
        case 'caption':
          return { entries: upsertEntry(state.entries, event, state.session?.sourceLang) }
        case 'session-ended':
          return { ended: true }
        case 'heartbeat':
          return {}
      }
    }),
}))
