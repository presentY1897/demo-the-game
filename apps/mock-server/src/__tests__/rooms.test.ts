import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { roomSchema } from '@thegame/realtime/http'
import { CODE_ALPHABET, CODE_LENGTH } from '../code'
import { RoomRegistry, ROOM_TTL_MS } from '../rooms'
import { requestJson, startTestServer, type TestServer } from './helpers'

const HOUR_MS = 60 * 60 * 1000

describe('RoomRegistry — 초대 코드', () => {
  it('6자리 대문자 영숫자를 발급한다', () => {
    const registry = new RoomRegistry()
    for (let i = 0; i < 200; i += 1) {
      const { inviteCode } = registry.create()
      expect(inviteCode).toHaveLength(CODE_LENGTH)
      expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/)
    }
    registry.close()
  })

  it('혼동 문자 0·O·1·I를 쓰지 않는다', () => {
    expect(CODE_ALPHABET).not.toMatch(/[0O1I]/)
    const registry = new RoomRegistry()
    const codes = Array.from({ length: 300 }, () => registry.create().inviteCode)
    expect(codes.join('')).not.toMatch(/[0O1I]/)
    registry.close()
  })

  it('코드가 겹치면 다시 뽑는다', () => {
    const queue = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'BBBBBB']
    let index = 0
    const registry = new RoomRegistry({ generateCode: () => queue[index++] ?? 'CCCCCC' })

    const first = registry.create()
    const second = registry.create()

    expect(first.inviteCode).toBe('AAAAAA')
    expect(second.inviteCode).toBe('BBBBBB')
    expect(registry.byInviteCode('AAAAAA')?.id).toBe(first.id)
    expect(registry.byInviteCode('BBBBBB')?.id).toBe(second.id)
    registry.close()
  })

  it('발급을 계속 실패하면 무음으로 넘어가지 않고 던진다', () => {
    const registry = new RoomRegistry({ generateCode: () => 'AAAAAA' })
    registry.create()
    expect(() => registry.create()).toThrow(/invite code generation failed/)
    registry.close()
  })

  it('대소문자·공백을 섞어 입력해도 같은 방으로 해석한다', () => {
    const registry = new RoomRegistry({ generateCode: () => 'K7QM2X' })
    const room = registry.create()
    expect(registry.byInviteCode(' k7qm2x ')?.id).toBe(room.id)
    expect(registry.byInviteCode('NOPE12')).toBeUndefined()
    registry.close()
  })
})

describe('RoomRegistry — 24시간 미활동 정리', () => {
  it('마지막 활동 24시간이 지난 방만 정리한다', () => {
    let now = Date.UTC(2026, 8, 1, 9, 0, 0)
    const registry = new RoomRegistry({ now: () => now })

    const stale = registry.create()
    now += HOUR_MS
    const fresh = registry.create()

    now += ROOM_TTL_MS - HOUR_MS
    expect(registry.sweep()).toBe(1)
    expect(registry.byId(stale.id)).toBeUndefined()
    expect(registry.byInviteCode(stale.inviteCode)).toBeUndefined()
    expect(registry.byId(fresh.id)).toBeDefined()

    now += HOUR_MS
    expect(registry.sweep()).toBe(1)
    expect(registry.size).toBe(0)
    registry.close()
  })

  it('활동이 있으면 TTL이 다시 시작된다', () => {
    let now = Date.UTC(2026, 8, 1, 9, 0, 0)
    const registry = new RoomRegistry({ now: () => now })
    const room = registry.create()

    now += ROOM_TTL_MS - 1000
    registry.touch(room)
    now += ROOM_TTL_MS - 1000

    expect(registry.sweep()).toBe(0)
    expect(registry.byId(room.id)).toBeDefined()
    registry.close()
  })

  it('정리된 방의 봇 타이머도 함께 걷어낸다', () => {
    let now = Date.UTC(2026, 8, 1, 9, 0, 0)
    const registry = new RoomRegistry({ now: () => now })
    const room = registry.create()
    const timer = setTimeout(() => undefined, 60_000)
    room.botTimers.add(timer)

    now += ROOM_TTL_MS
    registry.sweep()

    expect(room.botTimers.size).toBe(0)
    clearTimeout(timer)
    registry.close()
  })
})

describe('방 HTTP API', () => {
  let server: TestServer

  beforeEach(async () => {
    server = await startTestServer()
  })

  afterEach(async () => {
    await server.close()
  })

  it('POST /api/rooms가 201과 방·초대 코드를 준다', async () => {
    const created = await requestJson(`${server.baseUrl}/api/rooms`, { method: 'POST' })
    expect(created.status).toBe(201)

    const parsed = roomSchema.safeParse(created.body)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.inviteCode).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('GET /api/rooms/:inviteCode가 roomId를 돌려준다', async () => {
    const created = await requestJson(`${server.baseUrl}/api/rooms`, { method: 'POST' })
    const room = roomSchema.parse(created.body)

    const looked = await requestJson(`${server.baseUrl}/api/rooms/${room.inviteCode}`)
    expect(looked.status).toBe(200)
    expect(roomSchema.parse(looked.body).roomId).toBe(room.roomId)

    const lowercase = await requestJson(
      `${server.baseUrl}/api/rooms/${room.inviteCode.toLowerCase()}`,
    )
    expect(lowercase.status).toBe(200)
  })

  it('잘못된 코드는 404와 에러 본문을 준다', async () => {
    const response = await requestJson(`${server.baseUrl}/api/rooms/ZZZZZZ`)
    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ error: 'not-found' })
  })

  it('방 목록에 없는 코드로 조회해도 방이 생기지 않는다', async () => {
    await requestJson(`${server.baseUrl}/api/rooms/ZZZZZZ`)
    expect(server.mock.rooms.size).toBe(0)
  })
})
