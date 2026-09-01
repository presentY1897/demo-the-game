import { z } from 'zod'
import { RealtimeError } from './errors'

export const languageCodeSchema = z.string().min(2)

// ── 학회 자막 (SSE, 서버 → 클라이언트 단방향) ──────────────────────────────

export const captionEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session'),
    sessionId: z.string(),
    title: z.string(),
    speaker: z.string(),
    sourceLang: languageCodeSchema,
    targetLangs: z.array(languageCodeSchema),
  }),
  z.object({
    type: z.literal('caption'),
    id: z.string(),
    seq: z.number().int().nonnegative(),
    lang: languageCodeSchema,
    text: z.string(),
    /** false면 진행 중인 부분 자막 — 같은 id의 후속 이벤트로 교체된다 */
    isFinal: z.boolean(),
  }),
  z.object({ type: z.literal('session-ended'), sessionId: z.string() }),
  z.object({ type: z.literal('heartbeat'), ts: z.number() }),
])

export type CaptionEvent = z.infer<typeof captionEventSchema>

// ── 병원 대화 (WebSocket, 양방향) ──────────────────────────────────────────

export const participantRoleSchema = z.enum(['staff', 'patient'])
export type ParticipantRole = z.infer<typeof participantRoleSchema>

export const conversationEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('joined'), roomId: z.string(), role: participantRoleSchema }),
  z.object({
    type: z.literal('message'),
    id: z.string(),
    role: participantRoleSchema,
    lang: languageCodeSchema,
    text: z.string(),
    translation: z.object({ lang: languageCodeSchema, text: z.string() }),
    ts: z.number(),
  }),
  z.object({ type: z.literal('typing'), role: participantRoleSchema }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
])

export type ConversationEvent = z.infer<typeof conversationEventSchema>

export const clientCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join'),
    roomId: z.string(),
    role: participantRoleSchema,
    lang: languageCodeSchema,
  }),
  z.object({ type: z.literal('say'), text: z.string().min(1) }),
  z.object({ type: z.literal('typing') }),
])

export type ClientCommand = z.infer<typeof clientCommandSchema>

// ── 파싱 ───────────────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true; event: T }
  | { ok: false; error: RealtimeError }

function parseWith<T>(schema: z.ZodType<T>, raw: string): ParseResult<T> {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (cause) {
    return { ok: false, error: new RealtimeError('invalid-payload', 'Malformed JSON payload', { cause }) }
  }
  const result = schema.safeParse(json)
  if (result.success) return { ok: true, event: result.data }
  return { ok: false, error: new RealtimeError('invalid-payload', result.error.message, { cause: result.error }) }
}

export const parseCaptionEvent = (raw: string): ParseResult<CaptionEvent> =>
  parseWith(captionEventSchema, raw)

export const parseConversationEvent = (raw: string): ParseResult<ConversationEvent> =>
  parseWith(conversationEventSchema, raw)

/** 서버 수신용 — 클라이언트가 보낸 원본 프레임을 파싱한다 (파싱은 realtime에서만) */
export const parseClientCommand = (raw: string): ParseResult<ClientCommand> =>
  parseWith(clientCommandSchema, raw)
