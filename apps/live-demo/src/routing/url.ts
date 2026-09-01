import type { Route } from '../navigation'

/**
 * URL 경로 ↔ 라우트 변환. 순수 함수만 두고 History API는 `history.ts`가 맡는다 —
 * 왕복(parse ∘ serialize = id)을 유닛 테스트로 못박기 위해서다 (S03).
 *
 * 지원 경로
 *   `/`               → home
 *   `/session/:id`    → symposia
 *   `/room`           → caretalk (역할·코드 선택부터)
 *   `/room/:code`     → caretalk (초대 코드로 직행)
 *   `/console`        → console (S13 운영 콘솔)
 *   `/admin`          → admin   (S14 관리자 뷰)
 *   그 외             → home (모르는 경로로 빈 화면을 띄우지 않는다)
 */

export const HOME_PATH = '/'

/** 초대 코드는 사람이 받아 적는 값이라 대소문자·공백을 흡수한다 (서버와 같은 규칙) */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/** 세션 코드 = 목 서버의 세션 id. 소문자 슬러그라 소문자로 맞춘다 */
export function normalizeSessionCode(raw: string): string {
  return raw.trim().toLowerCase()
}

/** `%`로 끝나는 손상된 경로도 앱을 죽이지 않고 원문 그대로 취급한다 */
function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

function segments(path: string): string[] {
  const withoutHash = path.split('#')[0] ?? ''
  const withoutQuery = withoutHash.split('?')[0] ?? ''
  return withoutQuery
    .split('/')
    .filter((part) => part !== '')
    .map((part) => safeDecode(part))
}

export function parsePath(path: string): Route {
  const [head, second] = segments(path)

  switch (head) {
    case undefined:
      return { name: 'home' }
    case 'session':
      return second === undefined
        ? { name: 'home' }
        : { name: 'symposia', sessionId: normalizeSessionCode(second) }
    case 'room':
      return second === undefined
        ? { name: 'caretalk' }
        : { name: 'caretalk', inviteCode: normalizeInviteCode(second) }
    case 'console':
      return { name: 'console' }
    case 'admin':
      return { name: 'admin' }
    default:
      return { name: 'home' }
  }
}

export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'home':
      return HOME_PATH
    case 'symposia':
      return `/session/${encodeURIComponent(route.sessionId)}`
    case 'caretalk':
      return route.inviteCode === undefined
        ? '/room'
        : `/room/${encodeURIComponent(route.inviteCode)}`
    case 'console':
      return '/console'
    case 'admin':
      return '/admin'
  }
}

/** QR·공유 링크에 넣을 절대 URL */
export function routeToUrl(origin: string, route: Route): string {
  return `${origin.replace(/\/+$/, '')}${routeToPath(route)}`
}
