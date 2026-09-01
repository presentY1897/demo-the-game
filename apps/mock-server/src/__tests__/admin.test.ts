import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { adminRoomListSchema, adminSettingsSchema, roomSchema } from '@thegame/realtime/http'
import { ROOM_TTL_MS } from '../rooms'
import { SettingsStore, SUPPORTED_PATIENT_LANGS } from '../settings'
import {
  openWs,
  requestJson,
  startTestServer,
  waitUntil,
  type TestServer,
  type WsClient,
} from './helpers'

describe('GET /api/admin/rooms (S14)', () => {
  let server: TestServer
  const clients: WsClient[] = []
  let now = Date.UTC(2026, 8, 1, 9, 0, 0)

  beforeEach(async () => {
    now = Date.UTC(2026, 8, 1, 9, 0, 0)
    server = await startTestServer({
      now: () => now,
      room: { sweepIntervalMs: 20 },
      botTypingDelayMs: 5_000,
      botReplyDelayMs: 5_000,
    })
  })

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()))
    await server.close()
  })

  const listRooms = async () => {
    const response = await requestJson(`${server.baseUrl}/api/admin/rooms`)
    expect(response.status).toBe(200)
    return adminRoomListSchema.parse(response.body)
  }

  async function createRoom(): Promise<{ roomId: string; inviteCode: string }> {
    const created = await requestJson(`${server.baseUrl}/api/rooms`, { method: 'POST' })
    return roomSchema.parse(created.body)
  }

  async function join(roomId: string, role: 'staff' | 'patient', lang: string): Promise<WsClient> {
    const client = await openWs(server.wsUrl)
    clients.push(client)
    client.send({ type: 'join', roomId, role, lang })
    await client.waitFor((event) => event.type === 'joined', `${role} joined`)
    return client
  }

  it('열린 방이 없으면 빈 목록이다', async () => {
    expect(await listRooms()).toEqual([])
  })

  it('참여 구성·마지막 활동·봇 대행 여부를 보여준다', async () => {
    const room = await createRoom()
    await join(room.roomId, 'staff', 'ko')
    await join(room.roomId, 'patient', 'en')

    const [row] = await listRooms()
    expect(row).toMatchObject({
      inviteCode: room.inviteCode,
      memberCount: 2,
      roles: ['staff', 'patient'],
      botActive: false,
      lastActivityAt: now,
    })
  })

  it('의료진이 없는 방은 botActive가 true다', async () => {
    const room = await createRoom()
    await join(room.roomId, 'patient', 'en')

    const [row] = await listRooms()
    expect(row).toMatchObject({ memberCount: 1, roles: ['patient'], botActive: true })
  })

  it('대화 내용은 어떤 형태로도 실리지 않는다', async () => {
    const room = await createRoom()
    const patient = await join(room.roomId, 'patient', 'en')
    const staff = await join(room.roomId, 'staff', 'ko')

    patient.send({ type: 'say', text: 'my head hurts' })
    await staff.waitFor((event) => event.type === 'message', 'message delivered')
    staff.send({ type: 'say', text: '어디가 아프신가요?' })
    await patient.waitFor(
      (event) => event.type === 'message' && event.role === 'staff',
      'staff message delivered',
    )

    const response = await requestJson(`${server.baseUrl}/api/admin/rooms`)
    // strict 스키마라 명세에 없는 필드가 하나라도 붙으면 여기서 깨진다
    const rows = adminRoomListSchema.parse(response.body)
    expect(rows).toHaveLength(1)
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      'botActive',
      'inviteCode',
      'lastActivityAt',
      'memberCount',
      'roles',
    ])

    const serialized = JSON.stringify(response.body)
    expect(serialized).not.toContain('my head hurts')
    expect(serialized).not.toContain('어디가 아프신가요')
  })

  it('TTL이 지난 방은 정리 타이머가 돈 뒤 목록에서 사라진다', async () => {
    const room = await createRoom()
    await join(room.roomId, 'patient', 'en')
    expect(await listRooms()).toHaveLength(1)

    now += ROOM_TTL_MS + 1000
    await waitUntil(
      () => server.mock.rooms.size === 0,
      'TTL 정리 타이머가 방을 걷어내는 것',
    )

    expect(await listRooms()).toEqual([])
    const looked = await requestJson(`${server.baseUrl}/api/rooms/${room.inviteCode}`)
    expect(looked.status).toBe(404)
  })
})

describe('기관 설정 (S14)', () => {
  let server: TestServer

  beforeEach(async () => {
    server = await startTestServer()
  })

  afterEach(async () => {
    await server.close()
  })

  it('기본 지원 언어와 후보 목록을 준다', async () => {
    const response = await requestJson(`${server.baseUrl}/api/admin/settings`)
    expect(response.status).toBe(200)

    const settings = adminSettingsSchema.parse(response.body)
    expect(settings.patientLangs).toEqual(['en', 'ja', 'zh'])
    expect(settings.supportedLangs).toEqual([...SUPPORTED_PATIENT_LANGS])
  })

  it('PUT으로 저장하면 이후 조회에 반영된다', async () => {
    const updated = await requestJson(`${server.baseUrl}/api/admin/settings`, {
      method: 'PUT',
      body: { patientLangs: ['en', 'vi'] },
    })
    expect(updated.status).toBe(200)
    expect(adminSettingsSchema.parse(updated.body).patientLangs).toEqual(['en', 'vi'])

    const fetched = await requestJson(`${server.baseUrl}/api/admin/settings`)
    expect(adminSettingsSchema.parse(fetched.body).patientLangs).toEqual(['en', 'vi'])
  })

  it('지원 목록 밖 언어를 거부한다', async () => {
    const response = await requestJson(`${server.baseUrl}/api/admin/settings`, {
      method: 'PUT',
      body: { patientLangs: ['en', 'kl'] },
    })
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: 'unsupported-language' })

    const fetched = await requestJson(`${server.baseUrl}/api/admin/settings`)
    expect(adminSettingsSchema.parse(fetched.body).patientLangs).toEqual(['en', 'ja', 'zh'])
  })

  it('빈 배열을 거부한다 (최소 1개 언어)', async () => {
    const response = await requestJson(`${server.baseUrl}/api/admin/settings`, {
      method: 'PUT',
      body: { patientLangs: [] },
    })
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: 'invalid-body' })
  })

  it('본문이 JSON이 아니면 이유를 알려준다 (무음 실패 금지)', async () => {
    const raw = await fetch(`${server.baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })
    expect(raw.status).toBe(400)
    expect(await raw.json()).toMatchObject({ error: 'invalid-json' })
  })
})

describe('SettingsStore', () => {
  it('중복 언어를 접어서 저장한다', () => {
    const store = new SettingsStore()
    const result = store.update(['en', 'en', 'ja'])
    expect(result.ok).toBe(true)
    expect(store.get().patientLangs).toEqual(['en', 'ja'])
  })

  it('빈 목록과 미지원 언어를 코드로 구분해 거절한다', () => {
    const store = new SettingsStore()
    const empty = store.update([])
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.code).toBe('empty-language-list')

    const unsupported = store.update(['kl'])
    expect(unsupported.ok).toBe(false)
    if (!unsupported.ok) expect(unsupported.code).toBe('unsupported-language')

    // 거절된 요청은 기존 설정을 건드리지 않는다
    expect(store.get().patientLangs).toEqual(['en', 'ja', 'zh'])
  })
})
