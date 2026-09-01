import { useCallback, useEffect, useRef } from 'react'
import { ConversationSocket, type ParticipantRole } from '@thegame/realtime'
import { WS_BASE } from '../config'
import { useConversationStore } from '../stores/conversationStore'

const TYPING_THROTTLE_MS = 2000
const TYPING_CLEAR_MS = 5000

interface ConversationHandle {
  say: (text: string) => void
  notifyTyping: () => void
}

/**
 * 이미 정해진 방·역할·언어로 대화 소켓을 연다.
 *
 * 방을 만들거나 초대 코드를 해석하는 건 화면 단의 책임이다(S01) — 이 훅은
 * 마운트마다 랜덤 방을 만들지 않는다. 스토어의 신원(`enterRoom`)도 화면이 세운다.
 */
export function useConversation(
  roomId: string,
  role: ParticipantRole,
  lang: string,
): ConversationHandle {
  const socketRef = useRef<ConversationSocket | null>(null)
  const lastTypingSentAt = useRef(0)

  useEffect(() => {
    const socket = new ConversationSocket({
      url: `${WS_BASE}/ws/conversation`,
      onEvent: (event) => useConversationStore.getState().handleEvent(event),
      onStatus: (status) => {
        useConversationStore.getState().setStatus(status)
        // 연결이 열릴 때마다 join을 다시 보낸다. 소켓이 끊기면 서버 쪽 방 멤버십도
        // 함께 사라지므로, 재연결 후 조용히 방 밖에 서 있는 상태가 되지 않게 한다.
        if (status.state === 'open') socket.send({ type: 'join', roomId, role, lang })
      },
      onError: (error) => useConversationStore.getState().setError(error.message),
    })
    socket.connect()
    socketRef.current = socket
    return () => {
      socketRef.current = null
      socket.close()
    }
  }, [roomId, role, lang])

  // typing 인디케이터가 남는 것 방지 — 일정 시간 후 자동 해제
  const typingRole = useConversationStore((state) => state.typingRole)
  useEffect(() => {
    if (typingRole === null) return
    const timer = setTimeout(() => useConversationStore.getState().clearTyping(), TYPING_CLEAR_MS)
    return () => clearTimeout(timer)
  }, [typingRole])

  const say = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed === '') return
    socketRef.current?.send({ type: 'say', text: trimmed })
  }, [])

  const notifyTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSentAt.current < TYPING_THROTTLE_MS) return
    lastTypingSentAt.current = now
    socketRef.current?.send({ type: 'typing' })
  }, [])

  return { say, notifyTyping }
}
