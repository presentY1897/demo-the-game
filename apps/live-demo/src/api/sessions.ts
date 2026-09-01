import {
  decodeAdminSettings,
  decodeSessionList,
  type AdminSettings,
  type SessionSummary,
} from '@thegame/realtime'
import { requestOrThrow } from './client'

/** 참가자 로비의 세션 목록. `state`·`viewerCount`까지 함께 온다 (S13 서버측) */
export function fetchSessions(): Promise<SessionSummary[]> {
  return requestOrThrow('/api/sessions', decodeSessionList)
}

/**
 * 기관 설정 — 환자 온보딩의 언어 목록이 이걸 따른다 (S14 / F02).
 * 실패는 던진다: 호출부(TanStack Query)가 폴백 목록으로 떨어뜨린다.
 */
export function fetchAdminSettings(): Promise<AdminSettings> {
  return requestOrThrow('/api/admin/settings', decodeAdminSettings)
}
