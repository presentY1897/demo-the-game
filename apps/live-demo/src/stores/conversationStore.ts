import { create } from 'zustand'
import type { ConnectionStatus, ConversationEvent, ParticipantRole } from '@thegame/realtime'

export interface ChatMessage {
  id: string
  role: ParticipantRole
  /** 원문 언어 — 말한 사람이 쓰는 언어 */
  lang: string
  text: string
  /** 번역이 향한 언어 — 방의 반대편이 쓰는 언어 */
  translationLang: string
  translationText: string
  ts: number
}

/** 화면 단이 방을 만들거나 초대 코드를 해석한 결과 (S01) */
export interface RoomIdentity {
  roomId: string
  /** 서버가 발급한 6자리 코드. QR·공유 링크의 재료 */
  inviteCode: string
  role: ParticipantRole
  lang: string
}

interface ConversationState {
  roomId: string | null
  inviteCode: string | null
  myRole: ParticipantRole | null
  myLang: string | null
  /**
   * 상대가 방에 들어와 있는지. `joined`는 방 전원에게 브로드캐스트되므로
   * "내 역할이 아닌 누군가의 joined"가 곧 상대의 입장 신호다 —
   * 의료진 대기 화면은 이 값이 서면 대화 화면으로 넘어간다.
   * 상대의 발화·타이핑도 같은 증거로 친다: 내가 새로고침해서 그 사람의 joined를
   * 놓쳤어도(프로토콜에 재조회가 없다) 첫 반응에서 곧바로 따라잡는다.
   * 한 번 서면 내리지 않는다: 재연결로 대기 화면에 되돌아가지 않게.
   */
  peerJoined: boolean
  status: ConnectionStatus
  messages: ChatMessage[]
  typingRole: ParticipantRole | null
  lastError: string | null
  /** 방에 들어간다 — 이전 대화 흔적을 지우고 신원을 세운다 */
  enterRoom: (identity: RoomIdentity) => void
  setStatus: (status: ConnectionStatus) => void
  setError: (message: string) => void
  clearTyping: () => void
  handleEvent: (event: ConversationEvent) => void
  /** 방을 나간다 — 신원까지 전부 되돌린다 */
  reset: () => void
}

const emptyConversation = {
  peerJoined: false,
  status: { state: 'idle' } as ConnectionStatus,
  messages: [] as ChatMessage[],
  typingRole: null,
  lastError: null,
}

export const useConversationStore = create<ConversationState>((set) => ({
  roomId: null,
  inviteCode: null,
  myRole: null,
  myLang: null,
  ...emptyConversation,

  enterRoom: ({ roomId, inviteCode, role, lang }) =>
    set({ roomId, inviteCode, myRole: role, myLang: lang, ...emptyConversation }),

  setStatus: (status) => set({ status }),
  setError: (message) => set({ lastError: message }),
  clearTyping: () => set({ typingRole: null }),
  reset: () =>
    set({ roomId: null, inviteCode: null, myRole: null, myLang: null, ...emptyConversation }),

  handleEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'joined':
          // 내 입장은 신호가 아니다. 상대 역할의 joined만 대기 화면을 넘긴다.
          return event.role === state.myRole || state.peerJoined ? {} : { peerJoined: true }
        case 'message':
          return {
            peerJoined: state.peerJoined || event.role !== state.myRole,
            typingRole: null,
            messages: [
              ...state.messages,
              {
                id: event.id,
                role: event.role,
                lang: event.lang,
                text: event.text,
                translationLang: event.translation.lang,
                translationText: event.translation.text,
                ts: event.ts,
              },
            ],
          }
        case 'typing':
          return {
            peerJoined: state.peerJoined || event.role !== state.myRole,
            typingRole: event.role,
          }
        case 'error':
          return { lastError: event.message }
      }
    }),
}))
