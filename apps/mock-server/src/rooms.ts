import { randomUUID } from 'node:crypto'
import type { WebSocket } from 'ws'
import type { AdminRoom } from '@thegame/realtime/http'
import type { ParticipantRole } from '@thegame/realtime/types'
import { normalizeCode, randomCode } from './code'

/** 마지막 활동 이후 이만큼 지나면 방을 정리한다 (S01) */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 10 * 60 * 1000
const CODE_ATTEMPT_LIMIT = 50

export interface RoomMember {
  role: ParticipantRole
  lang: string
}

export interface RoomRecord {
  id: string
  inviteCode: string
  members: Map<WebSocket, RoomMember>
  /** 환자 쪽 언어 — 봇/의료진 발화의 번역 대상 */
  patientLang: string
  botReplyIndex: number
  botTimers: Set<NodeJS.Timeout>
  createdAt: number
  lastActivityAt: number
}

export interface RoomRegistryOptions {
  /** 테스트에서 시간을 밀기 위해 주입 */
  now?: () => number
  ttlMs?: number
  sweepIntervalMs?: number
  /** 테스트에서 코드 충돌을 재현하기 위해 주입 */
  generateCode?: () => string
}

export function hasRole(room: RoomRecord, role: ParticipantRole): boolean {
  for (const member of room.members.values()) if (member.role === role) return true
  return false
}

/** 실제 의료진이 없는 방에서만 봇이 의료진을 대행한다 (1인 데모용) */
export function isBotActive(room: RoomRecord): boolean {
  return room.members.size > 0 && !hasRole(room, 'staff')
}

/**
 * 관리자 현황용 직렬화 — **대화 내용은 절대 포함하지 않는다**(F02/S14).
 * 반환 타입이 `AdminRoom`(strict 스키마)이라 필드를 늘리면 계약 테스트가 먼저 깨진다.
 */
export function toAdminRoom(room: RoomRecord): AdminRoom {
  const roles = (['staff', 'patient'] as const).filter((role) => hasRole(room, role))
  return {
    inviteCode: room.inviteCode,
    memberCount: room.members.size,
    roles: [...roles],
    lastActivityAt: room.lastActivityAt,
    botActive: isBotActive(room),
  }
}

/**
 * 방 저장소 — 메모리 보관, 영속화 없음(S01).
 * 초대 코드로 방을 해석하는 건 HTTP의 책임이고, WS `join`은 기존처럼 roomId만 쓴다.
 */
export class RoomRegistry {
  readonly #rooms = new Map<string, RoomRecord>()
  readonly #codeToRoomId = new Map<string, string>()
  readonly #now: () => number
  readonly #ttlMs: number
  readonly #sweepIntervalMs: number
  readonly #generateCode: () => string
  #sweepTimer: NodeJS.Timeout | null = null

  constructor(options: RoomRegistryOptions = {}) {
    this.#now = options.now ?? Date.now
    this.#ttlMs = options.ttlMs ?? ROOM_TTL_MS
    this.#sweepIntervalMs = options.sweepIntervalMs ?? SWEEP_INTERVAL_MS
    this.#generateCode = options.generateCode ?? randomCode
  }

  /** 정리 타이머 시작 — 프로세스를 붙잡지 않도록 unref */
  start(): void {
    if (this.#sweepTimer) return
    this.#sweepTimer = setInterval(() => this.sweep(), this.#sweepIntervalMs)
    this.#sweepTimer.unref()
  }

  close(): void {
    if (this.#sweepTimer) clearInterval(this.#sweepTimer)
    this.#sweepTimer = null
    for (const room of this.#rooms.values()) this.#clearBotTimers(room)
    this.#rooms.clear()
    this.#codeToRoomId.clear()
  }

  get size(): number {
    return this.#rooms.size
  }

  /** `POST /api/rooms` — 새 방과 초대 코드 발급 */
  create(): RoomRecord {
    const now = this.#now()
    const room: RoomRecord = {
      id: randomUUID(),
      inviteCode: this.#issueCode(),
      members: new Map(),
      patientLang: 'en',
      botReplyIndex: 0,
      botTimers: new Set(),
      createdAt: now,
      lastActivityAt: now,
    }
    this.#rooms.set(room.id, room)
    this.#codeToRoomId.set(room.inviteCode, room.id)
    return room
  }

  /**
   * WS `join`이 알려주는 roomId로 방을 얻는다. 없으면 만든다 —
   * 클라이언트가 직접 방 id를 만들어 들어오는 기존 1인(봇) 데모 흐름 유지.
   */
  ensure(roomId: string): RoomRecord {
    const existing = this.#rooms.get(roomId)
    if (existing) return existing
    const now = this.#now()
    const room: RoomRecord = {
      id: roomId,
      inviteCode: this.#issueCode(),
      members: new Map(),
      patientLang: 'en',
      botReplyIndex: 0,
      botTimers: new Set(),
      createdAt: now,
      lastActivityAt: now,
    }
    this.#rooms.set(room.id, room)
    this.#codeToRoomId.set(room.inviteCode, room.id)
    return room
  }

  byId(roomId: string): RoomRecord | undefined {
    return this.#rooms.get(roomId)
  }

  /** `GET /api/rooms/:inviteCode` — 코드 → 방 해석 */
  byInviteCode(rawCode: string): RoomRecord | undefined {
    const roomId = this.#codeToRoomId.get(normalizeCode(rawCode))
    if (roomId === undefined) return undefined
    return this.#rooms.get(roomId)
  }

  /** 활동 시각 갱신 — 정리 타이머의 기준이 된다 */
  touch(room: RoomRecord): void {
    room.lastActivityAt = this.#now()
  }

  list(): RoomRecord[] {
    return [...this.#rooms.values()]
  }

  /** 만료된 방을 걷어낸다. 반환값은 정리한 방 수 */
  sweep(): number {
    const deadline = this.#now() - this.#ttlMs
    let removed = 0
    for (const room of this.#rooms.values()) {
      if (room.lastActivityAt > deadline) continue
      this.#clearBotTimers(room)
      this.#rooms.delete(room.id)
      this.#codeToRoomId.delete(room.inviteCode)
      removed += 1
    }
    return removed
  }

  #clearBotTimers(room: RoomRecord): void {
    for (const timer of room.botTimers) clearTimeout(timer)
    room.botTimers.clear()
  }

  /** 충돌하면 다시 뽑는다. 계속 실패하면 무음으로 넘어가지 않고 던진다 */
  #issueCode(): string {
    for (let attempt = 0; attempt < CODE_ATTEMPT_LIMIT; attempt += 1) {
      const code = normalizeCode(this.#generateCode())
      if (!this.#codeToRoomId.has(code)) return code
    }
    throw new Error(`invite code generation failed after ${CODE_ATTEMPT_LIMIT} attempts`)
  }
}
