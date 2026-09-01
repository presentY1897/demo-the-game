import {
  decodeAdminSettings,
  decodeSessionList,
  decodeSessionStatus,
  decodeSessionSummary,
  type AdminSettings,
  type CreateSessionRequest,
  type SessionStatus,
  type SessionSummary,
} from '@thegame/realtime'
import { requestJson, requestOrThrow, type ApiResult } from './client'

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

// ── 운영 콘솔 (S13) ─────────────────────────────────────────────────────────

/**
 * 세션 라이프사이클 제어 = 콘솔의 버튼 하나. 이름이 곧 엔드포인트 경로다.
 * 어떤 동작이 지금 가능한지는 `stores/consoleSelectors.ts`가 판단한다.
 */
export type SessionAction = 'start' | 'pause' | 'resume' | 'end'

/**
 * 콘솔의 호출은 전부 `requestJson`(던지지 않음)을 쓴다 — `invalid-transition`처럼
 * 화면이 인라인으로 설명해야 하는 실패가 대부분이라, 예외로 바꿔 화면을 날리면 안 된다.
 */
function jsonPost(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/** `POST /api/sessions` — 데모 스크립트 템플릿을 복제해 새 세션을 만든다(201) */
export function createSession(request: CreateSessionRequest): Promise<ApiResult<SessionSummary>> {
  return requestJson('/api/sessions', decodeSessionSummary, jsonPost(request))
}

/** `GET /api/sessions/:id/status` — 콘솔 상세의 폴링 대상 */
export function fetchSessionStatus(sessionId: string): Promise<ApiResult<SessionStatus>> {
  return requestJson(`/api/sessions/${encodeURIComponent(sessionId)}/status`, decodeSessionStatus)
}

/**
 * `POST /api/sessions/:id/{start|pause|resume|end}`.
 * 성공 응답이 곧 최신 status라 조작 뒤에 다시 물을 필요가 없다.
 */
export function controlSession(
  sessionId: string,
  action: SessionAction,
): Promise<ApiResult<SessionStatus>> {
  return requestJson(
    `/api/sessions/${encodeURIComponent(sessionId)}/${action}`,
    decodeSessionStatus,
    { method: 'POST' },
  )
}

/** `POST /api/sessions/:id/rate` — 발표 속도 제어(0.5–2배). 범위 밖은 서버가 `invalid-rate` */
export function setSessionRate(
  sessionId: string,
  rate: number,
): Promise<ApiResult<SessionStatus>> {
  return requestJson(
    `/api/sessions/${encodeURIComponent(sessionId)}/rate`,
    decodeSessionStatus,
    jsonPost({ rate }),
  )
}
