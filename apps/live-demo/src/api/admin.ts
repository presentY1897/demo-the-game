import {
  decodeAdminRooms,
  decodeAdminSettings,
  type AdminRoom,
  type AdminSettings,
  type AdminSettingsRequest,
} from '@thegame/realtime'
import {
  ADMIN_ROOMS_POLL_MS,
  ADMIN_ROOMS_QUERY_KEY,
  ADMIN_SETTINGS_QUERY_KEY,
} from './adminKeys'
import { requestJson, requestOrThrow, type ApiFailure } from './client'

/**
 * 관리자 화면(S14)의 HTTP. 본문 검증은 전부 `@thegame/realtime`의 decode에 맡긴다 —
 * 특히 `decodeAdminRooms`는 strict 스키마라 서버가 실수로 대화 내용을 실어 보내면
 * 화면에 그려지기 전에 파싱이 깨진다(F02의 개인정보 계약을 타입 층에서 잡는 장치).
 */

export { ADMIN_ROOMS_POLL_MS, ADMIN_ROOMS_QUERY_KEY, ADMIN_SETTINGS_QUERY_KEY }

/** `GET /api/admin/rooms` — 열린 방 목록(대화 내용 없음) */
export function fetchAdminRooms(): Promise<AdminRoom[]> {
  return requestOrThrow('/api/admin/rooms', decodeAdminRooms)
}

/**
 * 저장 실패를 화면이 구분해 설명할 수 있게 서버의 안정 코드를 들고 던진다.
 * `requestOrThrow`는 코드를 메시지 문자열에 접어 넣어버려 분기할 수 없다 —
 * "저장 실패"만 띄우는 무음에 가까운 실패를 피하려고 여기서만 따로 감싼다.
 */
export class AdminApiError extends Error {
  readonly code: string

  constructor(failure: ApiFailure) {
    super(`${failure.code}: ${failure.message}`)
    this.name = 'AdminApiError'
    this.code = failure.code
  }
}

/** `PUT /api/admin/settings` — 환자에게 제공할 언어 목록을 저장한다 */
export async function saveAdminSettings(patientLangs: readonly string[]): Promise<AdminSettings> {
  const body: AdminSettingsRequest = { patientLangs: [...patientLangs] }
  const result = await requestJson('/api/admin/settings', decodeAdminSettings, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!result.ok) throw new AdminApiError(result.error)
  return result.value
}
