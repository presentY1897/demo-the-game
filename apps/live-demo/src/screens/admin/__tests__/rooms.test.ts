import { describe, expect, it } from 'vitest'
import type { AdminRoom } from '@thegame/realtime'
import {
  partitionRooms,
  relativeTime,
  roleLabelKeys,
  roomStatus,
  ROOM_IDLE_MS,
} from '../rooms'

const NOW = Date.UTC(2026, 8, 1, 10, 0, 0)

const room = (over: Partial<AdminRoom> = {}): AdminRoom => ({
  inviteCode: 'ABC123',
  memberCount: 2,
  roles: ['staff', 'patient'],
  lastActivityAt: NOW,
  botActive: false,
  ...over,
})

describe('roomStatus', () => {
  it('참여자가 있으면 진행 중이다', () => {
    expect(roomStatus(room(), NOW)).toBe('active')
  })

  it('방금 만든 빈 방은 종료가 아니라 입장 대기다', () => {
    // 의료진이 방을 열자마자(참여 전) 폴링이 돌면 memberCount가 0으로 온다
    expect(roomStatus(room({ memberCount: 0, roles: [] }), NOW)).toBe('waiting')
  })

  it('환자가 새로고침해 잠깐 비어도 종료로 보지 않는다', () => {
    const justLeft = room({ memberCount: 0, roles: [], lastActivityAt: NOW - 5_000 })
    expect(roomStatus(justLeft, NOW)).toBe('waiting')
  })

  it('오래 빈 방은 종료된 상담이다', () => {
    const idle = room({ memberCount: 0, roles: [], lastActivityAt: NOW - ROOM_IDLE_MS })
    expect(roomStatus(idle, NOW)).toBe('ended')
  })

  it('오래됐어도 참여자가 있으면 진행 중이다 — 조용한 상담을 지우지 않는다', () => {
    const quiet = room({ memberCount: 2, lastActivityAt: NOW - 10 * ROOM_IDLE_MS })
    expect(roomStatus(quiet, NOW)).toBe('active')
  })
})

describe('partitionRooms', () => {
  it('종료된 방을 기본 목록에서 덜어내고, 최근 활동 순으로 세운다', () => {
    const rooms = [
      room({ inviteCode: 'OLD001', memberCount: 0, roles: [], lastActivityAt: NOW - ROOM_IDLE_MS * 2 }),
      room({ inviteCode: 'MID002', lastActivityAt: NOW - 30_000 }),
      room({ inviteCode: 'NEW003', lastActivityAt: NOW }),
    ]

    const { open, ended } = partitionRooms(rooms, NOW)

    expect(open.map((row) => row.room.inviteCode)).toEqual(['NEW003', 'MID002'])
    expect(ended.map((row) => row.room.inviteCode)).toEqual(['OLD001'])
  })

  it('종료된 방도 개수를 셀 수 있게 남긴다 — 조용히 버리지 않는다', () => {
    const rooms = [room({ memberCount: 0, roles: [], lastActivityAt: NOW - ROOM_IDLE_MS })]
    const { open, ended } = partitionRooms(rooms, NOW)

    expect(open).toEqual([])
    expect(ended).toHaveLength(1)
    expect(ended[0]?.status).toBe('ended')
  })

  it('빈 목록은 빈 목록이다', () => {
    expect(partitionRooms([], NOW)).toEqual({ open: [], ended: [] })
  })

  it('원본 배열을 뒤집지 않는다', () => {
    const rooms = [room({ inviteCode: 'AAA111', lastActivityAt: NOW - 1000 }), room({ inviteCode: 'BBB222' })]
    partitionRooms(rooms, NOW)

    expect(rooms.map((entry) => entry.inviteCode)).toEqual(['AAA111', 'BBB222'])
  })
})

describe('roleLabelKeys', () => {
  it('역할을 i18n 키로 옮긴다', () => {
    expect(roleLabelKeys(['staff', 'patient'])).toEqual(['conversation.staff', 'conversation.patient'])
  })

  it('아무도 없으면 빈 칸 대신 "없음"을 쓴다', () => {
    expect(roleLabelKeys([])).toEqual(['admin.rolesNone'])
  })
})

describe('relativeTime', () => {
  it('10초 안쪽은 "방금"이다', () => {
    expect(relativeTime(NOW - 3_000, NOW)).toEqual({ key: 'admin.justNow' })
  })

  it('분 단위 아래는 초로 센다 — 폴링이 살아 있는지 보이게', () => {
    expect(relativeTime(NOW - 42_000, NOW)).toEqual({ key: 'admin.secondsAgo', vars: { count: 42 } })
  })

  it('분·시간·일로 올라간다', () => {
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toEqual({ key: 'admin.minutesAgo', vars: { count: 5 } })
    expect(relativeTime(NOW - 3 * 3_600_000, NOW)).toEqual({ key: 'admin.hoursAgo', vars: { count: 3 } })
    expect(relativeTime(NOW - 2 * 86_400_000, NOW)).toEqual({ key: 'admin.daysAgo', vars: { count: 2 } })
  })

  it('서버 시계가 앞서 있어도 음수를 보여주지 않는다', () => {
    expect(relativeTime(NOW + 30_000, NOW)).toEqual({ key: 'admin.justNow' })
  })
})
