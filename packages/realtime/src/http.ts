import { z } from 'zod'
import { RealtimeError } from './errors'
import { languageCodeSchema, participantRoleSchema } from './types'

/**
 * 목 서버 HTTP 계약 — SSE/WS 이벤트와 마찬가지로 **파싱은 여기(@thegame/realtime)에서만**
 * 한다. 화면 코드는 `fetch` 응답 본문을 그대로 캐스팅하지 말고 아래 decode 함수를 쓴다.
 *
 * 스트림 이벤트의 `ParseResult`(문자열 → 이벤트)와 달리, HTTP 응답은 이미 `res.json()`으로
 * 값이 된 뒤에 검증하므로 결과 타입을 `DecodeResult`(unknown → 값)로 분리한다.
 */
export type DecodeResult<T> = { ok: true; value: T } | { ok: false; error: RealtimeError }

function decodeWith<T>(schema: z.ZodType<T>, value: unknown): DecodeResult<T> {
  const result = schema.safeParse(value)
  if (result.success) return { ok: true, value: result.data }
  return {
    ok: false,
    error: new RealtimeError('invalid-payload', result.error.message, { cause: result.error }),
  }
}

// ── 공통 에러 본문 ─────────────────────────────────────────────────────────

/** 2xx가 아닌 모든 응답의 본문. `error`는 분기용 안정 코드, `message`는 사람용 설명 */
export const apiErrorSchema = z.object({
  error: z.string().min(1),
  message: z.string().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

export const decodeApiError = (value: unknown): DecodeResult<ApiError> =>
  decodeWith(apiErrorSchema, value)

// ── CareTalk 방 (S01) ──────────────────────────────────────────────────────

/** `POST /api/rooms`, `GET /api/rooms/:inviteCode` 응답 */
export const roomSchema = z.object({
  roomId: z.string().min(1),
  inviteCode: z.string().min(1),
})

export type Room = z.infer<typeof roomSchema>

export const decodeRoom = (value: unknown): DecodeResult<Room> => decodeWith(roomSchema, value)

// ── Symposia 세션 (S13) ────────────────────────────────────────────────────

export const sessionStateSchema = z.enum(['waiting', 'playing', 'paused', 'ended'])
export type SessionState = z.infer<typeof sessionStateSchema>

/** `GET /api/sessions` 항목 — 참가자 로비와 운영 콘솔이 공용으로 쓴다 */
export const sessionSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  speaker: z.string(),
  sourceLang: languageCodeSchema,
  targetLangs: z.array(languageCodeSchema),
  state: sessionStateSchema,
  viewerCount: z.number().int().nonnegative(),
})

export type SessionSummary = z.infer<typeof sessionSummarySchema>

export const sessionListSchema = z.array(sessionSummarySchema)

export const decodeSessionList = (value: unknown): DecodeResult<SessionSummary[]> =>
  decodeWith(sessionListSchema, value)

export const decodeSessionSummary = (value: unknown): DecodeResult<SessionSummary> =>
  decodeWith(sessionSummarySchema, value)

/**
 * `GET /api/sessions/:id/status` 및 모든 제어 엔드포인트(start·pause·resume·end·rate)의
 * 응답. 제어 후 별도 조회 없이 최신 상태를 그대로 반영할 수 있게 통일했다.
 */
export const sessionStatusSchema = z.object({
  state: sessionStateSchema,
  viewerCount: z.number().int().nonnegative(),
  /** 재생 중인 문장 인덱스(0-based). 종료 후에는 `total`과 같다 */
  position: z.number().int().nonnegative(),
  /** 스크립트 총 문장 수 — 진행률 표시용 */
  total: z.number().int().nonnegative(),
  rate: z.number(),
})

export type SessionStatus = z.infer<typeof sessionStatusSchema>

export const decodeSessionStatus = (value: unknown): DecodeResult<SessionStatus> =>
  decodeWith(sessionStatusSchema, value)

/** `POST /api/sessions` 요청 본문 */
export const createSessionRequestSchema = z.object({
  title: z.string().trim().min(1),
  speaker: z.string().trim().min(1),
  sourceLang: languageCodeSchema,
  targetLangs: z.array(languageCodeSchema).min(1),
})

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>

export const MIN_PLAYBACK_RATE = 0.5
export const MAX_PLAYBACK_RATE = 2

export const playbackRateSchema = z.number().min(MIN_PLAYBACK_RATE).max(MAX_PLAYBACK_RATE)

/** `POST /api/sessions/:id/rate` 요청 본문 */
export const rateRequestSchema = z.object({ rate: playbackRateSchema })

export type RateRequest = z.infer<typeof rateRequestSchema>

// ── CareTalk 관리자 (S14) ──────────────────────────────────────────────────

/**
 * `GET /api/admin/rooms` 항목.
 * **strict** — 대화 내용 등 명세에 없는 필드가 하나라도 붙으면 파싱이 실패한다.
 * 관리자 화면에 개인정보가 새지 않는다는 계약을 타입 층에서 못박는 장치다(F02).
 */
export const adminRoomSchema = z.strictObject({
  inviteCode: z.string().min(1),
  memberCount: z.number().int().nonnegative(),
  roles: z.array(participantRoleSchema),
  /** epoch ms */
  lastActivityAt: z.number().int().nonnegative(),
  /** 실제 의료진이 없어 봇이 의료진을 대행 중인지 */
  botActive: z.boolean(),
})

export type AdminRoom = z.infer<typeof adminRoomSchema>

export const adminRoomListSchema = z.array(adminRoomSchema)

export const decodeAdminRooms = (value: unknown): DecodeResult<AdminRoom[]> =>
  decodeWith(adminRoomListSchema, value)

/** `GET·PUT /api/admin/settings` 응답 */
export const adminSettingsSchema = z.object({
  patientLangs: z.array(languageCodeSchema).min(1),
  /** 기관이 켤 수 있는 전체 언어 후보 — 관리자 토글 목록의 소스 */
  supportedLangs: z.array(languageCodeSchema),
})

export type AdminSettings = z.infer<typeof adminSettingsSchema>

export const decodeAdminSettings = (value: unknown): DecodeResult<AdminSettings> =>
  decodeWith(adminSettingsSchema, value)

/** `PUT /api/admin/settings` 요청 본문 — 빈 배열은 거부(최소 1개 언어) */
export const adminSettingsRequestSchema = z.object({
  patientLangs: z.array(languageCodeSchema).min(1),
})

export type AdminSettingsRequest = z.infer<typeof adminSettingsRequestSchema>
