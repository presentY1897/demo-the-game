import { decodeRoom, type Room } from '@thegame/realtime'
import { requestJson, type ApiResult } from './client'

/** `POST /api/rooms` — 의료진이 새 상담방을 연다 (S01) */
export function createRoom(): Promise<ApiResult<Room>> {
  return requestJson('/api/rooms', decodeRoom, { method: 'POST' })
}

/**
 * `GET /api/rooms/:inviteCode` — 환자가 받은 코드를 방으로 해석한다.
 * 대소문자·공백은 서버가 흡수하지만, 경로에 넣기 전에 인코딩은 해준다.
 */
export function findRoomByCode(code: string): Promise<ApiResult<Room>> {
  return requestJson(`/api/rooms/${encodeURIComponent(code)}`, decodeRoom)
}
