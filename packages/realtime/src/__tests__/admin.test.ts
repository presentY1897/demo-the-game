import { describe, expect, it } from 'vitest'
import {
  adminSettingsRequestSchema,
  decodeAdminRooms,
  decodeAdminSettings,
} from '../http'

const room = {
  inviteCode: 'K7QM2X',
  memberCount: 2,
  roles: ['staff', 'patient'],
  lastActivityAt: 1_756_000_000_000,
  botActive: false,
}

describe('adminRoomSchema', () => {
  it('현황 행을 파싱한다', () => {
    const result = decodeAdminRooms([room])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value[0]?.roles).toEqual(['staff', 'patient'])
  })

  it('대화 내용이 섞여 들어오면 파싱이 실패한다 (strict — 개인정보 유출 방지 계약)', () => {
    const leaked = { ...room, messages: [{ text: '머리가 아파요' }] }
    const result = decodeAdminRooms([leaked])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-payload')
  })

  it('알 수 없는 역할을 거부한다', () => {
    expect(decodeAdminRooms([{ ...room, roles: ['admin'] }]).ok).toBe(false)
  })
})

describe('adminSettingsSchema', () => {
  it('설정 응답을 파싱한다', () => {
    const result = decodeAdminSettings({
      patientLangs: ['en', 'ja'],
      supportedLangs: ['en', 'ja', 'zh'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.patientLangs).toEqual(['en', 'ja'])
  })

  it('빈 patientLangs 응답을 거부한다', () => {
    expect(decodeAdminSettings({ patientLangs: [], supportedLangs: ['en'] }).ok).toBe(false)
  })

  it('요청 스키마도 빈 배열을 거부한다 (최소 1개 언어)', () => {
    expect(adminSettingsRequestSchema.safeParse({ patientLangs: [] }).success).toBe(false)
    expect(adminSettingsRequestSchema.safeParse({ patientLangs: ['en'] }).success).toBe(true)
  })
})
