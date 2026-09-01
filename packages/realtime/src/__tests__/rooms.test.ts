import { describe, expect, it } from 'vitest'
import { decodeApiError, decodeRoom, roomSchema } from '../http'

describe('roomSchema / decodeRoom', () => {
  it('POST /api/rooms 응답을 파싱한다', () => {
    const result = decodeRoom({ roomId: 'a3f0-…', inviteCode: 'K7QM2X' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.roomId).toBe('a3f0-…')
      expect(result.value.inviteCode).toBe('K7QM2X')
    }
  })

  it('inviteCode가 빠지면 invalid-payload로 실패한다', () => {
    const result = decodeRoom({ roomId: 'room-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-payload')
  })

  it('빈 문자열 roomId를 거부한다', () => {
    expect(roomSchema.safeParse({ roomId: '', inviteCode: 'K7QM2X' }).success).toBe(false)
  })

  it('404 본문은 방이 아니라 에러로 파싱된다', () => {
    const body = { error: 'not-found', message: '초대 코드를 찾을 수 없습니다' }
    expect(decodeRoom(body).ok).toBe(false)

    const error = decodeApiError(body)
    expect(error.ok).toBe(true)
    if (error.ok) expect(error.value.error).toBe('not-found')
  })

  it('message 없는 에러 본문도 허용한다', () => {
    const result = decodeApiError({ error: 'not-found' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.message).toBeUndefined()
  })
})
