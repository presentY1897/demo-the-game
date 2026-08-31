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

/** 마운트마다 새 방을 만들어 봇 시나리오가 처음부터 시작되게 한다 */
function newRoomId(): string {
  return `demo-${Math.random().toString(36).slice(2, 10)}`
}

export function useConversation(role: ParticipantRole, lang: string): ConversationHandle {
  const socketRef = useRef<ConversationSocket | null>(null)
  const lastTypingSentAt = useRef(0)

  useEffect(() => {
    useConversationStore.getState().reset()
    const socket = new ConversationSocket({
      url: `${WS_BASE}/ws/conversation`,
      onEvent: (event) => useConversationStore.getState().handleEvent(event),
      onStatus: (status) => useConversationStore.getState().setStatus(status),
      onError: (error) => useConversationStore.getState().setError(error.message),
    })
    socket.connect()
    socket.send({ type: 'join', roomId: newRoomId(), role, lang })
    socketRef.current = socket
    return () => {
      socketRef.current = null
      socket.close()
    }
  }, [role, lang])

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
