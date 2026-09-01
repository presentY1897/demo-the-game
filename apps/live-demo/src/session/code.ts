import type { SessionSummary } from '@thegame/realtime'
import { normalizeSessionCode } from '../routing/url'

/**
 * Symposia 세션 코드 검증. 별도 발급 체계를 두지 않고 목 서버의 세션 id를
 * 그대로 코드로 취급한다(S02 범위 제외 항목) — 그래서 검증은 "지금 열려 있는
 * 세션 목록에 있는가"로 끝난다. 스트림을 열어보고 404를 받기 전에 걸러
 * 인라인 에러를 즉시 보여줄 수 있다.
 */
export type SessionCodeResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: 'empty' | 'unknown' }

export function resolveSessionCode(
  raw: string,
  sessions: readonly Pick<SessionSummary, 'id'>[],
): SessionCodeResult {
  const code = normalizeSessionCode(raw)
  if (code === '') return { ok: false, reason: 'empty' }
  const match = sessions.find((session) => normalizeSessionCode(session.id) === code)
  if (match === undefined) return { ok: false, reason: 'unknown' }
  return { ok: true, sessionId: match.id }
}
