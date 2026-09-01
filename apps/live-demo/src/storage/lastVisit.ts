import type { ParticipantRole } from '@thegame/realtime'
import type { Route } from '../navigation'
import { parsePath, routeToPath } from '../routing/url'

/**
 * 재접속 복귀 — 마지막으로 보던 라우트와 역할·언어를 남긴다.
 *
 * 앱 재시작 시 **자동으로 이동하지 않는다**. 홈 상단 배너로 제안만 하고 선택은
 * 사용자가 한다(S03) — 다른 세션을 보러 온 사람을 강제로 끌고 가지 않기 위해.
 *
 * 저장 형식은 JSON이 아니라 `v1|<path>|<role>|<lang>` 한 줄이다. 라우트 직렬화를
 * 이미 URL 어댑터가 하고 있어 재사용되고, 스키마 없는 JSON을 되읽는 자리를
 * 만들지 않는다(파싱은 realtime에서만 — CLAUDE.md).
 */

export const LAST_VISIT_KEY = 'thegame.live-demo.last-visit'

const FORMAT_VERSION = 'v1'
const SEPARATOR = '|'

export interface LastVisit {
  route: Route
  role: ParticipantRole | null
  lang: string | null
}

/** localStorage / AsyncStorage(동기 래퍼) 어느 쪽이든 이 모양이면 된다 */
export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function serializeLastVisit(visit: LastVisit): string {
  // 경로 조각은 encodeURIComponent를 거쳐 나오므로 구분자와 충돌하지 않는다
  return [FORMAT_VERSION, routeToPath(visit.route), visit.role ?? '', visit.lang ?? ''].join(
    SEPARATOR,
  )
}

export function parseLastVisit(raw: string | null): LastVisit | null {
  if (raw === null || raw === '') return null
  const [version, path, role, lang] = raw.split(SEPARATOR)
  if (version !== FORMAT_VERSION || path === undefined) return null
  return {
    route: parsePath(path),
    role: role === 'staff' || role === 'patient' ? role : null,
    lang: lang === undefined || lang === '' ? null : lang,
  }
}

/**
 * storage 접근은 통째로 실패할 수 있다 — 사파리 프라이빗 모드의 setItem 예외,
 * 쿠키/저장소 차단 설정 등. 복귀 제안은 있으면 좋은 편의라서, 실패해도 앱은
 * 그대로 굴러가야 한다. 대신 무음으로 삼키지 않고 개발자 콘솔에는 남긴다.
 */
export function saveLastVisit(storage: StorageLike | null, visit: LastVisit): void {
  if (storage === null) return
  try {
    storage.setItem(LAST_VISIT_KEY, serializeLastVisit(visit))
  } catch (cause) {
    console.warn('[live-demo] 마지막 방문 기록을 저장하지 못했습니다', cause)
  }
}

export function loadLastVisit(storage: StorageLike | null): LastVisit | null {
  if (storage === null) return null
  try {
    return parseLastVisit(storage.getItem(LAST_VISIT_KEY))
  } catch (cause) {
    console.warn('[live-demo] 마지막 방문 기록을 읽지 못했습니다', cause)
    return null
  }
}

export function clearLastVisit(storage: StorageLike | null): void {
  if (storage === null) return
  try {
    storage.removeItem(LAST_VISIT_KEY)
  } catch (cause) {
    console.warn('[live-demo] 마지막 방문 기록을 지우지 못했습니다', cause)
  }
}
