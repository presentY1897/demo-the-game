import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { roomSchema } from '@thegame/realtime/http'
import type { ConversationEvent } from '@thegame/realtime/types'
import { openWs, requestJson, sleep, startTestServer, type TestServer, type WsClient } from './helpers'

const BOT_TYPING_MS = 20
const BOT_REPLY_MS = 60
/** 봇이 응답했다면 이미 도착했을 만큼의 여유 */
const BOT_SETTLE_MS = 250

const isStaffMessage = (event: ConversationEvent): boolean =>
  event.type === 'message' && event.role === 'staff'

describe('WS 대화 — 초대 코드로 만난 2인 (S01)', () => {
  let server: TestServer
  const clients: WsClient[] = []

  beforeEach(async () => {
    server = await startTestServer({
      botTypingDelayMs: BOT_TYPING_MS,
      botReplyDelayMs: BOT_REPLY_MS,
    })
  })

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()))
    await server.close()
  })

  async function createRoom(): Promise<{ roomId: string; inviteCode: string }> {
    const created = await requestJson(`${server.baseUrl}/api/rooms`, { method: 'POST' })
    return roomSchema.parse(created.body)
  }

  async function connect(): Promise<WsClient> {
    const client = await openWs(server.wsUrl)
    clients.push(client)
    return client
  }

  it('의료진과 환자가 같은 방에 들어가 서로의 발화를 번역 병기로 받는다', async () => {
    const room = await createRoom()
    const staff = await connect()
    const patient = await connect()

    staff.send({ type: 'join', roomId: room.roomId, role: 'staff', lang: 'ko' })
    await staff.waitFor((event) => event.type === 'joined', 'staff joined')

    patient.send({ type: 'join', roomId: room.roomId, role: 'patient', lang: 'en' })
    await patient.waitFor((event) => event.type === 'joined', 'patient joined')

    // 환자 입장은 방 전체에 알려진다 — 의료진 대기 화면이 대화 화면으로 넘어가는 신호
    const staffSawPatient = await staff.waitFor(
      (event) => event.type === 'joined' && event.role === 'patient',
      'staff sees patient join',
    )
    expect(staffSawPatient.type).toBe('joined')

    patient.send({ type: 'say', text: 'my head hurts' })
    const delivered = await staff.waitFor(
      (event) => event.type === 'message' && event.role === 'patient',
      'patient message on staff side',
    )
    if (delivered.type !== 'message') throw new Error('expected message')
    expect(delivered.text).toBe('my head hurts')
    expect(delivered.translation.lang).toBe('ko')
    expect(delivered.translation.text.length).toBeGreaterThan(0)

    staff.send({ type: 'say', text: '어디가 아프신가요?' })
    const reply = await patient.waitFor(
      (event) => event.type === 'message' && event.role === 'staff',
      'staff message on patient side',
    )
    if (reply.type !== 'message') throw new Error('expected message')
    expect(reply.text).toBe('어디가 아프신가요?')
    expect(reply.translation.lang).toBe('en')
  })

  it('staff가 실재하는 방에서는 봇이 침묵한다 (회귀)', async () => {
    const room = await createRoom()
    const staff = await connect()
    const patient = await connect()

    staff.send({ type: 'join', roomId: room.roomId, role: 'staff', lang: 'ko' })
    await staff.waitFor((event) => event.type === 'joined', 'staff joined')
    patient.send({ type: 'join', roomId: room.roomId, role: 'patient', lang: 'en' })
    await patient.waitFor((event) => event.type === 'joined', 'patient joined')

    patient.send({ type: 'say', text: 'hello' })
    await staff.waitFor(
      (event) => event.type === 'message' && event.role === 'patient',
      'patient message',
    )
    await sleep(BOT_SETTLE_MS)

    // 의료진 역할의 메시지는 실제 의료진이 보낸 것만 있어야 한다 — 여기선 0건
    expect(patient.events.filter(isStaffMessage)).toHaveLength(0)
    expect(patient.events.filter((event) => event.type === 'typing')).toHaveLength(0)
  })

  it('봇 응답이 예약된 뒤 staff가 들어오면 예약분도 발화하지 않는다 (회귀)', async () => {
    const room = await createRoom()
    const patient = await connect()
    const staff = await connect()

    patient.send({ type: 'join', roomId: room.roomId, role: 'patient', lang: 'en' })
    await patient.waitFor((event) => event.type === 'joined', 'patient joined')
    // 봇 응답이 예약된 상태에서 의료진이 합류
    staff.send({ type: 'join', roomId: room.roomId, role: 'staff', lang: 'ko' })
    await staff.waitFor((event) => event.type === 'joined', 'staff joined')

    await sleep(BOT_SETTLE_MS)
    expect(patient.events.filter(isStaffMessage)).toHaveLength(0)
  })

  it('staff가 없으면 기존 봇 시나리오가 그대로 동작한다', async () => {
    const room = await createRoom()
    const patient = await connect()

    patient.send({ type: 'join', roomId: room.roomId, role: 'patient', lang: 'en' })
    const botReply = await patient.waitFor(isStaffMessage, 'bot reply')
    if (botReply.type !== 'message') throw new Error('expected message')
    expect(botReply.text).toBe('안녕하세요, 어떤 증상으로 방문하셨나요?')
    expect(botReply.translation).toEqual({
      lang: 'en',
      text: 'Hello, what symptoms bring you in today?',
    })
  })

  it('POST /api/rooms 없이 클라이언트가 만든 roomId로도 입장할 수 있다 (1인 데모 호환)', async () => {
    const patient = await connect()
    patient.send({ type: 'join', roomId: 'demo-legacy-1', role: 'patient', lang: 'en' })
    await patient.waitFor(isStaffMessage, 'bot reply in ad-hoc room')

    const room = server.mock.rooms.byId('demo-legacy-1')
    expect(room).toBeDefined()
    expect(room?.inviteCode).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('join 전 say는 not-joined 에러로 되돌아온다 (무음 실패 금지)', async () => {
    const client = await connect()
    client.send({ type: 'say', text: 'hello' })
    const error = await client.waitFor((event) => event.type === 'error', 'error event')
    if (error.type !== 'error') throw new Error('expected error')
    expect(error.code).toBe('not-joined')
  })

  it('마지막 참여자가 나가도 초대 코드는 살아 있다 (정리는 TTL이 맡는다)', async () => {
    const room = await createRoom()
    const patient = await connect()
    patient.send({ type: 'join', roomId: room.roomId, role: 'patient', lang: 'en' })
    await patient.waitFor((event) => event.type === 'joined', 'joined')
    await patient.close()
    await sleep(50)

    const looked = await requestJson(`${server.baseUrl}/api/rooms/${room.inviteCode}`)
    expect(looked.status).toBe(200)
    expect(server.mock.rooms.byId(room.roomId)?.members.size).toBe(0)
  })
})
