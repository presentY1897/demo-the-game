import { create } from 'zustand'
import type { ConnectionStatus, ConversationEvent, ParticipantRole } from '@thegame/realtime'

export interface ChatMessage {
  id: string
  role: ParticipantRole
  text: string
  translationText: string
  ts: number
}

interface ConversationState {
  status: ConnectionStatus
  messages: ChatMessage[]
  typingRole: ParticipantRole | null
  lastError: string | null
  setStatus: (status: ConnectionStatus) => void
  setError: (message: string) => void
  clearTyping: () => void
  handleEvent: (event: ConversationEvent) => void
  reset: () => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  status: { state: 'idle' },
  messages: [],
  typingRole: null,
  lastError: null,

  setStatus: (status) => set({ status }),
  setError: (message) => set({ lastError: message }),
  clearTyping: () => set({ typingRole: null }),
  reset: () => set({ status: { state: 'idle' }, messages: [], typingRole: null, lastError: null }),

  handleEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'joined':
          return {}
        case 'message':
          return {
            typingRole: null,
            messages: [
              ...state.messages,
              {
                id: event.id,
                role: event.role,
                text: event.text,
                translationText: event.translation.text,
                ts: event.ts,
              },
            ],
          }
        case 'typing':
          return { typingRole: event.role }
        case 'error':
          return { lastError: event.message }
      }
    }),
}))
