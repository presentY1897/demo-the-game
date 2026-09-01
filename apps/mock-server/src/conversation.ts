import { randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import {
  clientCommandSchema,
  type ConversationEvent,
} from '@thegame/realtime/types'
import { hasRole, type RoomMember, type RoomRecord, type RoomRegistry } from './rooms'
import { mockTranslate } from './translate'

const BOT_TYPING_DELAY_MS = 700
const BOT_REPLY_DELAY_MS = 1900

export interface ConversationServerOptions {
  /** 테스트에서 봇 응답을 기다리지 않도록 줄인다 */
  botTypingDelayMs?: number
  botReplyDelayMs?: number
}

const staffScript: Array<{ ko: string; en: string }> = [
  { ko: '안녕하세요, 어떤 증상으로 방문하셨나요?', en: 'Hello, what symptoms bring you in today?' },
  { ko: '언제부터 증상이 시작되었나요?', en: 'When did the symptoms start?' },
  { ko: '통증 부위를 조금 더 자세히 말씀해 주시겠어요?', en: 'Could you describe the painful area in more detail?' },
  { ko: '알레르기가 있거나 복용 중인 약이 있으신가요?', en: 'Do you have any allergies or medications you are taking?' },
  { ko: '네, 알겠습니다. 진찰 후에 치료 방향을 자세히 설명드릴게요.', en: 'I see. After the examination, I will explain the treatment plan in detail.' },
]

function sendEvent(socket: WebSocket, event: ConversationEvent): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event))
}

function broadcast(room: RoomRecord, event: ConversationEvent): void {
  for (const socket of room.members.keys()) sendEvent(socket, event)
}

export function createConversationServer(
  registry: RoomRegistry,
  options: ConversationServerOptions = {},
): WebSocketServer {
  const typingDelayMs = options.botTypingDelayMs ?? BOT_TYPING_DELAY_MS
  const replyDelayMs = options.botReplyDelayMs ?? BOT_REPLY_DELAY_MS
  const wss = new WebSocketServer({ noServer: true })

  /** 실제 의료진이 접속하기 전까지는 봇이 의료진 역할을 대신한다 (1인 데모용) */
  function scheduleBotReply(room: RoomRecord): void {
    if (hasRole(room, 'staff')) return
    const reply = staffScript[room.botReplyIndex % staffScript.length]
    if (!reply) return
    room.botReplyIndex += 1

    const typingTimer = setTimeout(() => {
      room.botTimers.delete(typingTimer)
      if (hasRole(room, 'staff')) return
      broadcast(room, { type: 'typing', role: 'staff' })
    }, typingDelayMs)
    room.botTimers.add(typingTimer)

    const replyTimer = setTimeout(() => {
      room.botTimers.delete(replyTimer)
      // 예약 후 의료진이 들어왔다면 봇은 침묵한다 (S01 완성 기준 2)
      if (hasRole(room, 'staff')) return
      const translationText =
        room.patientLang === 'en' ? reply.en : mockTranslate(reply.ko, 'ko', room.patientLang)
      broadcast(room, {
        type: 'message',
        id: randomUUID(),
        role: 'staff',
        lang: 'ko',
        text: reply.ko,
        translation: { lang: room.patientLang, text: translationText },
        ts: Date.now(),
      })
      registry.touch(room)
    }, replyDelayMs)
    room.botTimers.add(replyTimer)
  }

  wss.on('connection', (socket: WebSocket) => {
    let joined: { room: RoomRecord; member: RoomMember } | null = null

    socket.on('message', (raw) => {
      let json: unknown
      try {
        json = JSON.parse(String(raw))
      } catch {
        sendEvent(socket, { type: 'error', code: 'invalid-command', message: 'Malformed JSON' })
        return
      }
      const parsed = clientCommandSchema.safeParse(json)
      if (!parsed.success) {
        sendEvent(socket, { type: 'error', code: 'invalid-command', message: parsed.error.message })
        return
      }
      const command = parsed.data

      switch (command.type) {
        case 'join': {
          // 초대 코드 해석은 HTTP(GET /api/rooms/:code)에서 끝났고, 여기는 roomId만 받는다.
          // 모르는 roomId면 새로 만든다 — 환자가 방을 직접 만드는 1인 데모 흐름 유지.
          const room = registry.ensure(command.roomId)
          const member: RoomMember = { role: command.role, lang: command.lang }
          room.members.set(socket, member)
          if (command.role === 'patient') room.patientLang = command.lang
          registry.touch(room)
          joined = { room, member }
          // 입장 사실은 방 전체에 알린다 — 의료진 대기 화면이 환자 입장을 감지하는 신호.
          // 이벤트 스키마는 그대로라 실시간 프로토콜은 바뀌지 않는다 (S01).
          broadcast(room, { type: 'joined', roomId: room.id, role: member.role })
          if (member.role === 'patient') scheduleBotReply(room)
          break
        }
        case 'say': {
          if (!joined) {
            sendEvent(socket, { type: 'error', code: 'not-joined', message: 'Send a join command first' })
            return
          }
          const { room, member } = joined
          const targetLang = member.role === 'patient' ? 'ko' : room.patientLang
          registry.touch(room)
          broadcast(room, {
            type: 'message',
            id: randomUUID(),
            role: member.role,
            lang: member.lang,
            text: command.text,
            translation: {
              lang: targetLang,
              text: mockTranslate(command.text, member.lang, targetLang),
            },
            ts: Date.now(),
          })
          if (member.role === 'patient') scheduleBotReply(room)
          break
        }
        case 'typing': {
          if (!joined) return
          const { room, member } = joined
          registry.touch(room)
          for (const [other] of room.members) {
            if (other !== socket) sendEvent(other, { type: 'typing', role: member.role })
          }
          break
        }
      }
    })

    socket.on('close', () => {
      if (!joined) return
      const { room } = joined
      room.members.delete(socket)
      registry.touch(room)
      // 방 자체는 남긴다 — 초대 코드가 살아 있어야 새로고침·재접속으로 돌아올 수 있고,
      // 정리는 마지막 활동 24시간 뒤 TTL이 맡는다 (S01).
      if (room.members.size === 0) {
        for (const timer of room.botTimers) clearTimeout(timer)
        room.botTimers.clear()
      }
    })
  })

  return wss
}
