import type { MessageKey } from '@thegame/i18n'
import type { AdminRoom, ParticipantRole } from '@thegame/realtime'

/**
 * 상담 현황 표시 규칙(S14). 서버는 방을 TTL(24시간) 전까지 지우지 않으므로
 * "끝난 상담"과 "이제 막 연 방"을 화면이 구분해야 한다 — 응답에 있는 건
 * `memberCount`와 `lastActivityAt`뿐이라 그 둘로만 판단한다.
 */

export type RoomStatus =
  /** 지금 누군가 들어와 있다 */
  | 'active'
  /** 아직 비어 있지만 방금 만들었거나 방금 비었다 — 환자 입장 대기 */
  | 'waiting'
  /** 오래 비어 있다 = 끝난 상담. 서버는 TTL까지 들고 있지만 관리자에겐 소음이다 */
  | 'ended'

/**
 * 참여자 0명이 이만큼 이어지면 종료로 본다.
 * 폴링 주기(10초)의 6배 — 환자가 새로고침하느라 몇 초 비는 방을 종료로 오판하지 않으면서,
 * 상담이 끝난 방은 1분 안에 기본 목록에서 빠진다.
 */
export const ROOM_IDLE_MS = 60_000

export interface RoomRow {
  room: AdminRoom
  status: RoomStatus
}

export function roomStatus(room: AdminRoom, now: number): RoomStatus {
  if (room.memberCount > 0) return 'active'
  return now - room.lastActivityAt >= ROOM_IDLE_MS ? 'ended' : 'waiting'
}

export interface RoomPartition {
  /** 기본 목록 — 진행 중 + 입장 대기 */
  open: RoomRow[]
  /** 접어 두는 목록. 개수는 항상 보여준다 — 조용히 사라지게 두지 않는다 */
  ended: RoomRow[]
}

/** 최근 활동이 위로. 관리자가 보는 건 "지금 무슨 일이 있는가"다 */
export function partitionRooms(rooms: readonly AdminRoom[], now: number): RoomPartition {
  const rows = rooms
    .map((room) => ({ room, status: roomStatus(room, now) }))
    .sort((a, b) => b.room.lastActivityAt - a.room.lastActivityAt)

  return {
    open: rows.filter((row) => row.status !== 'ended'),
    ended: rows.filter((row) => row.status === 'ended'),
  }
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, MessageKey> = {
  active: 'admin.statusActive',
  waiting: 'admin.statusWaiting',
  ended: 'admin.statusEnded',
}

export const ROLE_LABEL: Record<ParticipantRole, MessageKey> = {
  staff: 'conversation.staff',
  patient: 'conversation.patient',
}

/** 역할 구성 셀. 아무도 없으면 빈 칸 대신 "없음"을 쓴다 */
export function roleLabelKeys(roles: readonly ParticipantRole[]): MessageKey[] {
  if (roles.length === 0) return ['admin.rolesNone']
  return roles.map((role) => ROLE_LABEL[role])
}

export interface RelativeTime {
  key: MessageKey
  vars?: { count: number }
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * 마지막 활동을 상대시간으로. 초 단위까지 내려가는 이유는 폴링 주기가 10초여서
 * "방금"만 계속 보이면 갱신되고 있는지 알 수 없기 때문이다.
 * 서버·기기 시계가 어긋나 미래 시각이 와도 음수를 보여주지 않는다.
 */
export function relativeTime(at: number, now: number): RelativeTime {
  const diff = Math.max(0, now - at)
  if (diff < 10 * SECOND) return { key: 'admin.justNow' }
  if (diff < MINUTE) return { key: 'admin.secondsAgo', vars: { count: Math.floor(diff / SECOND) } }
  if (diff < HOUR) return { key: 'admin.minutesAgo', vars: { count: Math.floor(diff / MINUTE) } }
  if (diff < DAY) return { key: 'admin.hoursAgo', vars: { count: Math.floor(diff / HOUR) } }
  return { key: 'admin.daysAgo', vars: { count: Math.floor(diff / DAY) } }
}
