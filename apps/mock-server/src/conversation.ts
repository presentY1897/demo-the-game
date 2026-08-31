import { randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import {
  clientCommandSchema,
  type ConversationEvent,
  type ParticipantRole,
} from '@thegame/realtime/types'
import { mockTranslate } from './translate'

interface Member {
  role: ParticipantRole
  lang: string
}

interface Room {
  id: string
  members: Map<WebSocket, Member>
  patientLang: string
  botReplyIndex: number
  botTimers: Set<NodeJS.Timeout>
}

const BOT_TYPING_DELAY_MS = 700
const BOT_REPLY_DELAY_MS = 1900

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

function broadcast(room: Room, event: ConversationEvent): void {
  for (const socket of room.members.keys()) sendEvent(socket, event)
}

/** 실제 의료진이 접속하기 전까지는 봇이 의료진 역할을 대신한다 (1인 데모용) */
function hasRealStaff(room: Room): boolean {
  for (const member of room.members.values()) if (member.role === 'staff') return true
  return false
}

function scheduleBotReply(room: Room): void {
  if (hasRealStaff(room)) return
  const reply = staffScript[room.botReplyIndex % staffScript.length]
  if (!reply) return
  room.botReplyIndex += 1

  const typingTimer = setTimeout(() => {
    room.botTimers.delete(typingTimer)
    broadcast(room, { type: 'typing', role: 'staff' })
  }, BOT_TYPING_DELAY_MS)
  room.botTimers.add(typingTimer)

  const replyTimer = setTimeout(() => {
    room.botTimers.delete(replyTimer)
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
  }, BOT_REPLY_DELAY_MS)
  room.botTimers.add(replyTimer)
}

export function createConversationServer(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true })
  const rooms = new Map<string, Room>()

  wss.on('connection', (socket: WebSocket) => {
    let joined: { room: Room; member: Member } | null = null

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
          let room = rooms.get(command.roomId)
          if (!room) {
            room = {
              id: command.roomId,
              members: new Map(),
              patientLang: 'en',
              botReplyIndex: 0,
              botTimers: new Set(),
            }
            rooms.set(command.roomId, room)
          }
          const member: Member = { role: command.role, lang: command.lang }
          room.members.set(socket, member)
          if (command.role === 'patient') room.patientLang = command.lang
          joined = { room, member }
          sendEvent(socket, { type: 'joined', roomId: room.id, role: member.role })
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
      if (room.members.size === 0) {
        for (const timer of room.botTimers) clearTimeout(timer)
        rooms.delete(room.id)
      }
    })
  })

  return wss
}
